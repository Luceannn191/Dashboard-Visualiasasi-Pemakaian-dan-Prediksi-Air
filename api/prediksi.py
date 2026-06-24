from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import warnings

# Mengabaikan warning dari statsmodels agar terminal tetap bersih
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

def prediksi_holt_winters(data_historis):
    data = np.array(data_historis, dtype=float)
    n = len(data)

    # Logika Cerdas: Sesuaikan model dengan ketersediaan data
    try:
        if n >= 12:
            # Jika data >= 12 bulan, gunakan Full Holt-Winters (Musiman + Tren)
            # initialization_method='heuristic' sangat aman untuk data yang tidak terlalu panjang
            model = ExponentialSmoothing(
                data, 
                trend='add', 
                seasonal='add', 
                seasonal_periods=12,
                initialization_method="heuristic"
            )
            model_label = "Holt-Winters Exponential Smoothing (Tren + Musiman)"
        else:
            # Jika data < 12 bulan, algoritma musiman akan error. 
            # Otomatis turun ke Holt's Linear (Hanya membaca arah Tren)
            model = ExponentialSmoothing(
                data, 
                trend='add', 
                seasonal=None,
                initialization_method="estimated"
            )
            model_label = "Holt Linear Smoothing (Hanya Tren, Data < 12 Bulan)"
        
        # Eksekusi kalkulasi model
        fit_model = model.fit()
        
        # Tembak prediksi 12 langkah (bulan) ke depan
        prediksi_raw = fit_model.forecast(12)
        
        # Bersihkan data: pastikan tidak ada prediksi minus (volume air tidak mungkin negatif)
        prediksi_final = [int(round(max(0, val))) for val in prediksi_raw]
        
        return prediksi_final, model_label
        
    except Exception as e:
        # Fallback pamungkas jika terjadi anomali angka matematis ekstrem
        print(f"Peringatan Holt-Winters: {e}")
        rata_rata = np.mean(data[-6:]) if n >= 6 else np.mean(data)
        return [int(round(rata_rata))] * 12, "Fallback Average Sederhana"


@app.route('/api/prediksi', methods=['POST'])
def hitung_prediksi():
    try:
        data_masuk = request.json
        data_historis = data_masuk.get('data_historis')

        if not data_historis or len(data_historis) < 2:
            return jsonify({
                "error": "Data historis tidak valid. Minimal butuh 2 bulan data."
            }), 400

        data_array = [float(x) for x in data_historis]
        bulan_terakhir = len(data_array)

        # Panggil fungsi Holt-Winters yang baru
        hasil_prediksi, model_label = prediksi_holt_winters(data_array)

        return jsonify({
            "status": "sukses",
            "pesan": "Prediksi 12 bulan ke depan berhasil dihitung",
            "model_digunakan": model_label,
            "data_historis_terakhir_bulan_ke": bulan_terakhir,
            "hasil_prediksi_12_bulan": hasil_prediksi
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
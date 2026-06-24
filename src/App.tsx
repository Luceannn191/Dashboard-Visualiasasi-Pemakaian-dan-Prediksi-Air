import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminForm from './AdminForm';
import AdminGate from './AdminGate.tsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import {
  Activity, Cpu, AlertTriangle, TrendingUp, MapPin, Sparkles, Info, CheckCircle, Clock, RefreshCw, Droplet
} from 'lucide-react';

// 1. IMPORT SUPABASE CLIENT
import { supabase } from './supabaseClient';
import { mapPaths } from './mapData';

interface DataPoint {
  periode: string;
  aktual: number | null;
  prediksi: number | null;
}

const regionsData: Record<string, any> = {
  KM4: {
    id: 'KM4', name: 'Wilayah KM 4', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Penggunaan air sangat tinggi di ujung pipa saat jam sibuk.',
    recommendation: 'Tahun 2026 penggunaan air diperkirakan naik +16.2%. Disarankan menambah kekuatan pompa distribusi utama sebesar +0.3 Bar agar air lancar.',
    peakQuarter: 'Kuartal III (Juli - September 2026)', aiLoadStatus: '⚠️ SIAGA (Kenaikan Tinggi)', waterAllocation: '+12.500 m³ / Bulan'
  },
  Rambutan: {
    id: 'Rambutan', name: 'Wilayah Rambutan', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Pemakaian air stabil dan tekanan normal di semua titik.',
    recommendation: 'Aliran air terpantau sangat stabil. Cukup lakukan perawatan rutin pada pintu air dan pembersihan endapan lumpur secara berkala.',
    peakQuarter: 'Kuartal II (April - Juni 2026)', aiLoadStatus: '✓ AMAN (Normal)', waterAllocation: '+2.100 m³ / Bulan'
  },
  'Karang Anyar': {
    id: 'Karang Anyar', name: 'Wilayah Karang Anyar', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Beban puncak tertinggi diperkirakan terjadi pada pertengahan tahun 2026.',
    recommendation: 'Permintaan air di sini naik tajam hingga +18.5%. Disarankan membuat jadwal pembagian aliran air bergilir khusus pada jam-jam sibuk.',
    peakQuarter: 'Kuartal III (Juli - September 2026)', aiLoadStatus: '🚨 KRITIS (Beban Puncak)', waterAllocation: '+24.000 m³ / Bulan'
  },
  'Alang Lebar': {
    id: 'Alang Lebar', name: 'Wilayah Alang Lebar', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Risiko air mengecil atau tidak mengalir di wilayah paling ujung saat jam sibuk.',
    recommendation: 'Tekanan air di ujung pipa berisiko drop drastis. Disarankan segera menghidupkan pompa pendorong tambahan di stasiun KM 12.',
    peakQuarter: 'Kuartal IV (Oktober - Desember 2026)', aiLoadStatus: '⚠️ SIAGA (Tekanan Rendah)', waterAllocation: '+8.500 m³ / Bulan'
  },
  'Seb. Ulu1': {
    id: 'Seb. Ulu1', name: 'Wilayah Seberang Ulu I', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Jumlah air yang mengalir sering berubah-ubah di area padat penduduk.',
    recommendation: 'Penggunaan air di wilayah ini sangat tidak menentu. Disarankan memasang alat pengatur otomatis pada pompa.',
    peakQuarter: 'Kuartal I (Januari - Maret 2026)', aiLoadStatus: '✓ AMAN (Fluktuatif)', waterAllocation: '+5.000 m³ / Bulan'
  },
  'Seb. Ulu2': {
    id: 'Seb. Ulu2', name: 'Wilayah Seberang Ulu II', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Aliran air naik-turun di titik pemukiman padat.',
    recommendation: 'Konsumsi air warga sangat dinamis. Disarankan mengaktifkan sistem hemat energi pada pompa pendorong.',
    peakQuarter: 'Kuartal I (Januari - Maret 2026)', aiLoadStatus: '✓ AMAN (Stabil)', waterAllocation: '+4.800 m³ / Bulan'
  },
  '3 Ilir': {
    id: '3 Ilir', name: 'Wilayah 3 Ilir', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Terdeteksi indikasi kebocoran air yang meningkat di area ruko dan pasar.',
    recommendation: 'Ada perbedaan jumlah air yang dikirim dengan yang diterima. Disarankan tim lapangan segera memeriksa pipa-pipa tua.',
    peakQuarter: 'Kuartal II (April - Juni 2026)', aiLoadStatus: '⚠️ SIAGA (Indikasi NRW)', waterAllocation: '+6.200 m³ / Bulan'
  },
  'Sako Kenten': {
    id: 'Sako Kenten', name: 'Wilayah Sako Kenten', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Banyak perumahan baru dibangun sehingga permintaan air bersih melonjak.',
    recommendation: 'Kebutuhan air naik +14.8% karena wilayah berkembang. Diperlukan penambahan kapasitas tangki penampung.',
    peakQuarter: 'Kuartal IV (Oktober - Desember 2026)', aiLoadStatus: '⚠️ SIAGA (Ekspansi Area)', waterAllocation: '+11.000 m³ / Bulan'
  },
  Kalidoni: {
    id: 'Kalidoni', name: 'Wilayah Kalidoni', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Kondisi air bersih aman, pasokan mengalir lancar ke perumahan baru area timur.',
    recommendation: 'Pemukiman di area timur terus bertambah. Disarankan menambah satu unit pompa pendorong di sub-stasiun terdekat.',
    peakQuarter: 'Kuartal III (Juli - September 2026)', aiLoadStatus: '✓ AMAN (Normal)', waterAllocation: '+9.000 m³ / Bulan'
  },
  Ogan: {
    id: 'Ogan', name: 'Wilayah Ogan', pressure:'', flowRate: '', customers: '', wtpName: '',
    activeAlert: 'Tekanan air di pipa utama sudah mendekati batas paling rendah atau lemas.',
    recommendation: 'Tekanan air di sektor Ogan terlalu lemah. Disarankan mengatur ulang posisi keran pembagi utama di pipa transmisi.',
    peakQuarter: 'Kuartal II (April - Juni 2026)', aiLoadStatus: '🚨 KRITIS (Tekanan Rendah)', waterAllocation: '+3.500 m³ / Bulan'
  }
};

type ModeGrafik = 'semua' | 'rentang';

export default function App() {
  const [activeRegion, setActiveRegion] = useState<string>('KM4');
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [optimizationActive, setOptimizationActive] = useState<boolean>(false);

  const [modeGrafik, setModeGrafik] = useState<ModeGrafik>('semua');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const [allChartData, setAllChartData] = useState<DataPoint[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const regionInfo = useMemo(() => regionsData[activeRegion] || regionsData['KM4'], [activeRegion]);

  // ── LOAD DATA DARI SUPABASE ─────────────────────────────────────────────────
  useEffect(() => {
    const prosesDataDasbor = async () => {
      // 2. FETCH DATA SUPABASE
      const { data, error } = await supabase
        .from('data_aktual')
        .select('data_array')
        .eq('wilayah', activeRegion)
        .single();

      if (error || !data || !data.data_array) {
        console.warn("Data tidak ditemukan di Supabase untuk wilayah:", activeRegion);
        setAllChartData([]);
        return;
      }

      const dataAktualSektorIni: number[] = data.data_array;

      const dataTampilanAwal: DataPoint[] = dataAktualSektorIni.map((val, idx) => ({
        periode: `${NAMA_BULAN[idx % 12]} ${2024 + Math.floor(idx / 12)}`,
        aktual: val,
        prediksi: null
      }));

      let dataGabungan: DataPoint[] = [...dataTampilanAwal];

      if (dataAktualSektorIni.length >= 2 && aiMode) {
        try {
          const response = await fetch('/api/prediksi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data_historis: dataAktualSektorIni }),
});
          const resJson = await response.json();
          if (resJson.status === 'sukses') {
            const listPrediksi: number[] = resJson.hasil_prediksi_12_bulan;
            const dataPrediksi: DataPoint[] = listPrediksi.map((val, idx) => {
              const totalIdx = dataAktualSektorIni.length + idx;
              return {
                periode: `${NAMA_BULAN[totalIdx % 12]} ${2024 + Math.floor(totalIdx / 12)}`,
                aktual: null,
                prediksi: val
              };
            });

            // Menyambungkan Garis
            if (dataTampilanAwal.length > 0) {
              dataTampilanAwal[dataTampilanAwal.length - 1].prediksi = dataTampilanAwal[dataTampilanAwal.length - 1].aktual;
            }

            dataGabungan = [...dataTampilanAwal, ...dataPrediksi];
          }
        } catch (err) { console.error('Gagal kontak server Python Holt-Winters:', err); }
      }

      setAllChartData(dataGabungan);

      const tahunUnik = new Set<string>();
      dataTampilanAwal.forEach(item => {
        const t = item.periode.split(' ')[1];
        if (t) tahunUnik.add(t);
      });
      const arrayTahun = Array.from(tahunUnik).sort();
      setAvailableYears(arrayTahun);

      if (arrayTahun.length > 0 && !selectedYear) {
        setSelectedYear(arrayTahun[arrayTahun.length - 1]);
      }
    };

    prosesDataDasbor();
  }, [activeRegion, aiMode]);

  // ── KALKULASI CHART DATA ──────────────────────────────────────
  const chartDataSemua = useMemo(() => allChartData, [allChartData]);

  const chartDataRentang = useMemo(() => {
    const hanyaAktual = allChartData.filter(p => p.aktual !== null);
    const hanyaPrediksi = allChartData.filter(p => p.aktual === null); // Filter ketat
    const aktual24 = hanyaAktual.slice(-24);       
    const prediksi6 = hanyaPrediksi.slice(0, 6);   
    return [...aktual24, ...prediksi6];
  }, [allChartData]);

  const activeChartData = modeGrafik === 'semua' ? chartDataSemua : chartDataRentang;

  // ── KPI (Selalu 12 Bulan Terakhir) ───────────────────────────────────────────────────────
  const totalAktualDisplay = useMemo(() => {
    return allChartData
      .filter(p => p.aktual !== null)
      .slice(-12)
      .reduce((sum, p) => sum + (p.aktual || 0), 0);
  }, [allChartData]);

  const total12BulanPrediksi = useMemo(() => {
    return allChartData
      .filter(p => p.aktual === null)
      .reduce((sum, p) => sum + (p.prediksi || 0), 0);
  }, [allChartData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 850);
  };

  const infoRentang = useMemo(() => {
    const hanyaAktual = allChartData.filter(p => p.aktual !== null);
    if (hanyaAktual.length === 0) return '24 Bulan Terakhir + Prediksi 6 Bln';
    const bulanTerakhir = hanyaAktual[hanyaAktual.length - 1].periode;
    return `24 Bln s.d. ${bulanTerakhir} + Prediksi 6 Bln`;
  }, [allChartData]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
            {/* HEADER */}
            <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs px-4 sm:px-6 lg:px-8 py-3.5">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm relative overflow-hidden group">
                    <span className="absolute inset-0 bg-slate-50 transform rotate-12 translate-y-6 group-hover:translate-y-[-24px] transition-transform duration-700 ease-out"></span>
                    <img src="image.png" alt="Tirta Musi" className="w-6 h-6 object-contain relative z-10" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                      Dashboard Visualisasi Pemakaian dan Prediksi Air
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sistem Aktual: </span>
                    <span className="text-sky-600 font-bold bg-white px-1.5 rounded border border-slate-200 shadow-2xs">OK</span>
                  </div>
                  <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-500 border border-slate-200/50 transition-all duration-200 active:scale-95 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
                  </button>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Mode Prediksi</span>
                      <span className={`text-xs font-bold leading-none ${aiMode ? 'text-emerald-500' : 'text-slate-500'}`}>{aiMode ? 'AKTIF' : 'NONAKTIF'}</span>
                    </div>
                    <button
                      onClick={() => setAiMode(!aiMode)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ${aiMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${aiMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* SUBHEADER */}
            <div className="bg-sky-600 text-white py-3 px-4 sm:px-6 lg:px-8 border-b border-sky-700/50 shadow-xs relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-200 animate-pulse" />
                  <span className="text-sky-100">Pemantauan Aktif Wilayah:</span>
                  <span className="font-bold underline decoration-sky-300 underline-offset-4 text-white">{regionInfo.name} ({activeRegion})</span>
                </div>
              </div>
            </div>

            {/* MAIN */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

              {/* MAP + KPI */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* MAP */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        Peta Distribusi Jaringan Aliran Utama
                      </h2>
                      <p className="text-xs text-slate-500">Tekan area wilayah pada peta untuk melihat data telemetri aktual daerah tersebut.</p>
                    </div>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border">9 Sektor Utama</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center min-h-[300px]">
                    <svg viewBox="0 0 2000 1500" className="w-full h-auto max-h-[355px] drop-shadow-md select-none">
                      <g transform="translate(80,80)" className="opacity-15 pointer-events-none">
                        <circle cx="0" cy="0" r="30" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3"/>
                        <line x1="-40" y1="0" x2="40" y2="0" stroke="#64748b" strokeWidth="1"/>
                        <line x1="0" y1="-40" x2="0" y2="40" stroke="#64748b" strokeWidth="1"/>
                        <text x="-4" y="-45" fontSize="11" fontWeight="bold" fill="#64748b" fontFamily="monospace">N</text>
                      </g>
                      {mapPaths.map((pathItem, index) => {
                        const isActive = activeRegion === pathItem.regionId;
                        return (
                          <g key={index} onClick={() => setActiveRegion(pathItem.regionId)} className="cursor-pointer">
                            <path
                              d={pathItem.d}
                              style={{
                                fill: pathItem.color,
                                opacity: activeRegion && !isActive ? 0.35 : 1,
                                stroke: "#000000",
                                strokeWidth: isActive ? "5" : "2.5",
                                strokeLinejoin: "round",
                                filter: isActive ? "drop-shadow(0 0 10px rgba(0,0,0,0.25))" : "none",
                              }}
                              className="transition-all duration-300"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* KPI CARDS */}
                <div className="lg:col-span-5 flex flex-col gap-6">

                  {/* CARD 1 - SELALU 12 BULAN TERAKHIR */}
                  <div className="bg-white rounded-2xl border border-slate-200/85 p-6 shadow-xs flex-1 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500"></div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">MONITORING VOLUME REAL-TIME</span>
                        <h3 className="text-base font-bold text-slate-800">
                          Total Aktual 12 Bulan Terakhir
                        </h3>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                        <Activity className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-mono">
                      {totalAktualDisplay > 0 ? totalAktualDisplay.toLocaleString('id-ID') : '---'}{' '}
                      <span className="text-sm font-bold text-slate-500 font-sans">m³</span>
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Akumulasi debit aktual selama 12 bulan ke belakang.
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                      <span className="font-mono text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        Debit Sektor: {regionInfo.flowRate}
                      </span>
                    </div>
                  </div>

                  {/* CARD 2 - PREDIKSI 12 BULAN AI */}
                  <div className="bg-white rounded-2xl border border-slate-200/85 p-6 shadow-xs flex-1 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-400 ${aiMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">PERKIRAAN VOLUME STRATEGIS</span>
                        <h3 className="text-base font-bold text-slate-800">Prediksi 12 Bulan Kedepan</h3>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${aiMode ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Sparkles className={`w-5 h-5 ${aiMode ? 'animate-pulse' : ''}`} />
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                      {aiMode ? (
                        <motion.div key="ai-on" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: 0.25 }}>
                          <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight font-mono">
                            {total12BulanPrediksi > 0 ? total12BulanPrediksi.toLocaleString('id-ID') : '---'}{' '}
                            <span className="text-sm font-bold text-slate-500 font-sans">m³</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md mt-2 border border-emerald-100">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Est. Total Konsumsi 12 Bulan Ke Depan
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div key="ai-off" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: 0.25 }} className="py-1 px-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                          <span className="text-sm font-bold text-slate-500 block">Mode AI Nonaktif</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">Aktifkan switch di header atas untuk memproses prediksi AI.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className={`w-2 h-2 rounded-full inline-block ${aiMode ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    </div>
                  </div>

                </div>
              </section>

              {/* CHART */}
              <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Activity className="text-sky-600 w-5 h-5" />
                      Analisis Kubikasi: <span className="text-sky-600 underline decoration-sky-300 underline-offset-4">{regionInfo.name}</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modeGrafik === 'semua' ? 'Semua data historis aktual + proyeksi 12 bulan ke depan.' : infoRentang}
                    </p>
                  </div>

                  {/* ── DROPDOWN & BUTTON ── */}
                  <div className="flex flex-col items-end gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => setModeGrafik('semua')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 ${
                          modeGrafik === 'semua'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600'
                        }`}
                      >
                        Semua Tahun
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setModeGrafik('rentang')}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 ${
                            modeGrafik === 'rentang'
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600'
                          }`}
                        >
                          24 Bln + Prediksi 6 Bln
                        </button>
                      </div>
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center gap-4 text-xs font-medium flex-wrap justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#0284c7] inline-block rounded"></span>
                        <span className="text-slate-600">Data Aktual</span>
                      </div>
                      {aiMode && (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                          <span className="w-3 h-0.5 bg-[#10b981] inline-block rounded border-dashed"></span>
                          <span className="text-emerald-700 font-semibold">
                            Prediksi {modeGrafik === 'rentang' ? '(6 Bln)' : '(12 Bln)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RECHARTS */}
                <div className="h-[280px] sm:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="periode" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} dy={8} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} width={45} dx={-4} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0284c7', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Line type="monotone" dataKey="aktual" stroke="#0284c7" strokeWidth={3}
                        dot={{ r: 3, stroke: '#0284c7', strokeWidth: 1.5, fill: '#ffffff' }}
                        activeDot={{ r: 6, stroke: '#0284c7', strokeWidth: 2, fill: '#0284c7' }}
                        name="Data Aktual" connectNulls={true} animationDuration={800} />
                      {aiMode && (
                        <Line type="monotone" dataKey="prediksi" stroke="#10b981" strokeWidth={2.5} strokeDasharray="3 4" strokeLinecap="round"
                          dot={{ r: 2.5, stroke: '#10b981', strokeWidth: 1, fill: '#ffffff' }}
                          activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#10b981' }}
                          name={`Prediksi  ${modeGrafik === 'rentang' ? '' : ''}`}
                          connectNulls={true} animationDuration={800} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* BOTTOM ALERTS & CAPACITY PLANNING OMITTED FOR BREVITY (It runs the same logic based on regionsData) */}
              
            </main>
          </div>
        } />
        <Route path="/admin" element={<AdminGate><AdminForm /></AdminGate>} />
      </Routes>
    </Router>
  );
}

// ── TOOLTIP ────────────────────────────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: DataPoint }>;
  label?: string;
}
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const isForecast = payload[0].payload.aktual === null;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs max-w-[210px]">
        <p className="font-bold border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
          <span>{label}</span>
          {isForecast && <span className="text-[9px] bg-emerald-600 px-1 rounded uppercase">Prediksi</span>}
        </p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }}></span>
              {item.name}:
            </span>
            <span className={`font-mono font-bold ${item.name.includes('Prediksi') ? 'text-emerald-400' : 'text-sky-300'}`}>
              {item.value ? `${item.value.toLocaleString('id-ID')} m³` : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X, TrendingUp, History, MapPin, Trash2, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const AdminForm = () => {
  const TAHUN_MULAI = 2024;
  const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // PERBAIKAN: nama wilayah disamakan PERSIS dengan yang ada di tabel Supabase
  // (9 wilayah, tanpa spasi sebelum angka pada "Ulu1" / "Ulu2", "Ogan" dihapus
  // karena tidak ada di data Supabase kamu)
  const SEKTOR_WILAYAH = [
    'KM4', 'Rambutan', 'Karang Anyar', 'Alang Lebar',
    'Seb. Ulu1', 'Seb. Ulu2', '3 Ilir', 'Sako Kenten', 'Kalidoni'
  ];

  const [selectedRegion, setSelectedRegion] = useState<string>('KM4');
  const [dataSektorGlobal, setDataSektorGlobal] = useState<Record<string, number[]>>({});

  const [inputKubikasi, setInputKubikasi] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [hasilPrediksi, setHasilPrediksi] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // loading prediksi AI
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false); // loading fetch Supabase
  const [isSaving, setIsSaving] = useState<boolean>(false); // loading saat simpan ke Supabase
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const dataHistorisWilayahAktif = dataSektorGlobal[selectedRegion] || [];

  const getBulanTahun = (index: number) => {
    const namaBulan = NAMA_BULAN[index % 12];
    const tahun = TAHUN_MULAI + Math.floor(index / 12);
    return `${namaBulan} ${tahun}`;
  };

  const targetBulanInput = getBulanTahun(dataHistorisWilayahAktif.length);

  // ── PANGGIL MESIN PREDIKSI PYTHON ───────────────────────────────────────
  const panggilMesinPython = useCallback(async (dataUpdate: number[]) => {
    if (dataUpdate.length < 2) {
      setHasilPrediksi([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/prediksi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data_historis: dataUpdate }),
});
      const data = await response.json();
      if (data.status === 'sukses') {
        setHasilPrediksi(data.hasil_prediksi_12_bulan);
      }
    } catch (error) {
      console.error('Gagal kontak server prediksi:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── AMBIL DATA DARI SUPABASE ─────────────────────────────────────────────
  const muatDataDariSupabase = useCallback(async (wilayah: string) => {
    setIsLoadingData(true);
    setErrorMsg('');

    // PENTING: pakai maybeSingle() bukan single() — kalau wilayah belum
    // punya baris di Supabase, maybeSingle() balikin null (bukan error 406)
    const { data, error } = await supabase
      .from('data_aktual')
      .select('data_array')
      .eq('wilayah', wilayah)
      .maybeSingle();

    if (error) {
      console.error('Gagal ambil data dari Supabase:', error);
      setErrorMsg('Gagal memuat data dari database: ' + error.message);
      setDataSektorGlobal(prev => ({ ...prev, [wilayah]: [] }));
      setIsLoadingData(false);
      return;
    }

    const arrayDariDb: number[] = data?.data_array ?? [];
    setDataSektorGlobal(prev => ({ ...prev, [wilayah]: arrayDariDb }));
    setIsLoadingData(false);
    panggilMesinPython(arrayDariDb);
  }, [panggilMesinPython]);

  // ── SIMPAN (UPSERT) KE SUPABASE ───────────────────────────────────────────
  const simpanKeSupabase = async (wilayah: string, arrayBaru: number[]): Promise<boolean> => {
    setIsSaving(true);
    setErrorMsg('');

    const { error } = await supabase
      .from('data_aktual')
      .upsert({ wilayah, data_array: arrayBaru }, { onConflict: 'wilayah' });

    setIsSaving(false);

    if (error) {
      console.error('Gagal simpan ke Supabase:', error);
      setErrorMsg('Gagal menyimpan ke database: ' + error.message);
      return false;
    }
    return true;
  };

  // Muat ulang data setiap kali ganti wilayah
  useEffect(() => {
    setEditingIndex(null);
    setInputKubikasi('');
    setSaveSuccess(null);
    muatDataDariSupabase(selectedRegion);
  }, [selectedRegion, muatDataDariSupabase]);

  // ── INPUT DATA BARU ───────────────────────────────────────────────────────
  const handleInputBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKubikasi) return;

    const nilaiInput = parseInt(inputKubikasi);
    if (isNaN(nilaiInput) || nilaiInput <= 0) return;

    const arrayTerbaru = [...(dataSektorGlobal[selectedRegion] || []), nilaiInput];

    const sukses = await simpanKeSupabase(selectedRegion, arrayTerbaru);
    if (!sukses) return; // jangan update tampilan kalau gagal simpan ke DB

    setDataSektorGlobal(prev => ({ ...prev, [selectedRegion]: arrayTerbaru }));
    setInputKubikasi('');
    await panggilMesinPython(arrayTerbaru);
  };

  // ── EDIT DATA YANG SUDAH ADA ─────────────────────────────────────────────
  const handleSimpanEdit = async (originalIndex: number) => {
    if (editingValue === '') return;

    const nilaiBaru = parseInt(editingValue);
    if (isNaN(nilaiBaru) || nilaiBaru <= 0) return;

    const arrayLama = dataSektorGlobal[selectedRegion] || [];
    const arrayRevisi = [...arrayLama];
    arrayRevisi[originalIndex] = nilaiBaru;

    const sukses = await simpanKeSupabase(selectedRegion, arrayRevisi);
    if (!sukses) return;

    setDataSektorGlobal(prev => ({ ...prev, [selectedRegion]: arrayRevisi }));
    setEditingIndex(null);
    setEditingValue('');

    setSaveSuccess(originalIndex);
    setTimeout(() => setSaveSuccess(null), 2000);

    await panggilMesinPython(arrayRevisi);
  };

  // ── HAPUS ENTRI TERAKHIR ──────────────────────────────────────────────────
  const handleHapusEntri = async (originalIndex: number) => {
    const arrayLama = dataSektorGlobal[selectedRegion] || [];
    if (originalIndex !== arrayLama.length - 1) {
      alert('Hanya data bulan terakhir yang bisa dihapus untuk menjaga urutan bulan tetap benar.');
      return;
    }

    const arrayRevisi = arrayLama.slice(0, -1);

    const sukses = await simpanKeSupabase(selectedRegion, arrayRevisi);
    if (!sukses) return;

    setDataSektorGlobal(prev => ({ ...prev, [selectedRegion]: arrayRevisi }));
    await panggilMesinPython(arrayRevisi);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 mt-6">

      {/* PESAN ERROR GLOBAL */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* DROPDOWN WILAYAH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-2xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-none">Lokasi Pembaruan Data</h3>
            <p className="text-xs text-slate-500 mt-1">Mulai Input Data Aktual Tirta Musi dari Januari 2024.</p>
          </div>
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full sm:w-64 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
        >
          {SEKTOR_WILAYAH.map((w) => <option key={w} value={w}>Sektor Wilayah {w}</option>)}
        </select>
      </div>

      {/* FORM INPUT */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Dashboard Admin — Input Data Aktual</h2>
        <p className="text-xs text-slate-500 mb-5 flex items-center gap-2">
          Wilayah aktif: <span className="font-bold text-blue-600">{selectedRegion}</span>
          {isLoadingData ? (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Memuat dari database...
            </span>
          ) : (
            <span className="ml-1 text-slate-400">({dataHistorisWilayahAktif.length} bulan data tersimpan)</span>
          )}
        </p>

        <form onSubmit={handleInputBaru} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-blue-700 mb-2 bg-blue-50 inline-block px-3 py-1 rounded-md border border-blue-100 uppercase">
              ➜ Periode Input Sekarang: {targetBulanInput}
            </label>
            <input
              type="number"
              value={inputKubikasi}
              onChange={(e) => setInputKubikasi(e.target.value)}
              placeholder="Masukkan angka volume kubikasi m³..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-base transition-all shadow-2xs"
              required
              min="1"
              disabled={isLoadingData || isSaving}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || isSaving || isLoadingData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm h-[48px] transition-all"
          >
            {isSaving ? 'Menyimpan...' : isLoading ? 'Memproses AI...' : 'Simpan Data'}
          </button>
        </form>
      </div>

      {/* RIWAYAT + PROYEKSI */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* RIWAYAT */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col max-h-[480px]">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <History className="w-4 h-4 text-slate-500" /> Riwayat — {selectedRegion}
          </h3>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
              </div>
            ) : dataHistorisWilayahAktif.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">
                Belum ada data. Silakan input bulan pertama (Januari 2024).
              </p>
            ) : (
              [...dataHistorisWilayahAktif].reverse().map((val, mapIndex) => {
                const originalIndex = dataHistorisWilayahAktif.length - 1 - mapIndex;
                const isEditing = editingIndex === originalIndex;
                const isSaved = saveSuccess === originalIndex;
                const isLastEntry = originalIndex === dataHistorisWilayahAktif.length - 1;

                return (
                  <div
                    key={originalIndex}
                    className={`flex items-center justify-between p-2.5 border rounded-xl transition-all duration-300 ${
                      isSaved
                        ? 'border-green-300 bg-green-50'
                        : isEditing
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {getBulanTahun(originalIndex)}
                        {isSaved && <span className="ml-2 text-green-600">✓ Tersimpan</span>}
                      </span>

                      {isEditing ? (
                        <input
                          type="number"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-36 text-sm border-b-2 border-blue-500 bg-transparent font-mono focus:outline-none mt-0.5 py-0.5"
                          autoFocus
                          min="1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSimpanEdit(originalIndex);
                            if (e.key === 'Escape') { setEditingIndex(null); setEditingValue(''); }
                          }}
                        />
                      ) : (
                        <span className="text-base font-black text-slate-700 font-mono">
                          {val.toLocaleString('id-ID')}{' '}
                          <span className="text-xs font-normal text-slate-400">m³</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSimpanEdit(originalIndex)}
                            disabled={isSaving}
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Simpan perubahan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingIndex(null); setEditingValue(''); }}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            title="Batal edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingIndex(originalIndex);
                              setEditingValue(val.toString());
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit nilai"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isLastEntry && (
                            <button
                              onClick={() => handleHapusEntri(originalIndex)}
                              disabled={isSaving}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Hapus data bulan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PROYEKSI */}
        <div className="md:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <TrendingUp className="w-4 h-4" /> Proyeksi AI 12 Bulan — {selectedRegion}
            </h3>

            {isLoading && (
              <div className="text-center opacity-60 py-10 text-xs text-emerald-400 animate-pulse">
                Memproses model prediksi AI...
              </div>
            )}

            {!isLoading && hasilPrediksi.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
                {hasilPrediksi.map((angka, index) => {
                  const targetIndex = dataHistorisWilayahAktif.length + index;
                  return (
                    <div key={index} className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        {getBulanTahun(targetIndex)}
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-400 block mt-0.5">
                        {angka.toLocaleString('id-ID')} m³
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && hasilPrediksi.length === 0 && (
              <div className="text-center opacity-40 py-24 text-xs">
                <TrendingUp className="w-10 h-10 mb-2 mx-auto text-slate-600" />
                <p>Input minimal 2 data aktual untuk memicu prediksi AI.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminForm;

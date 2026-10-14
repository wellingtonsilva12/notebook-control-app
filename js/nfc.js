/* Leitura NFC pelo navegador (Web NFC, só Chrome para Android) */

/* ---------- NFC (Web NFC API, fallback manual) ---------- */
function nfcSupported(){ return 'NDEFReader' in window; }

async function readNfcTag(onRead, onError){
  if(!nfcSupported()){ onError('Web NFC indisponível neste navegador. Use Chrome no Android.'); return; }
  try{
    const reader = new NDEFReader();
    await reader.scan();
    reader.onreading = (event) => {
      const id = event.serialNumber || uid();
      onRead(id);
    };
    reader.onreadingerror = () => onError('Falha ao ler a tag. Aproxime novamente.');
  }catch(e){
    onError('Não foi possível ativar o leitor NFC (' + (e.message || 'permissão negada') + ').');
  }
}

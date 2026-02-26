document.getElementById('copyBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    // Select elementinden seçilen değeri alıyoruz
    const selectedStyle = document.getElementById('format').value; 
    
    status.textContent = "DOI Aranıyor...";

    // Aktif sekmeyi bul
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    
    chrome.tabs.sendMessage(tab.id, { action: "getDOI" }, async (response) => {
        if (response && response.doi) {
            status.textContent = `${selectedStyle.toUpperCase()} formatında alınıyor...`;

            try {
                const res = await fetch(`https://doi.org/${response.doi}`, {
                    headers: { 
                        // Buradaki 'apa' yerine kullanıcının seçtiği 'selectedStyle' değişkenini koyduk
                        'Accept': `text/x-bibliography; style=${selectedStyle}` 
                    }
                });

                const citation = await res.text();

                await navigator.clipboard.writeText(citation);
                status.textContent = "Kopyalandı! (CTRL+V yapabilirsin)";
            } catch (err) {
                status.textContent = "Hata: Atıf çekilemedi.";
            }
        } else {
            status.textContent = "DOI bulunamadı!";
        }
    });
});
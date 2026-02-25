document.getElementById('copyBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.textContent = "DOI Aranıyor...";

    // Aktif sekmeyi bul
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Content script'e "DOI bul" mesajı gönder
    chrome.tabs.sendMessage(tab.id, { action: "getDOI" }, async (response) => {
        if (response && response.doi) {
            status.textContent = "Referans alınıyor...";

            try {
                // Crossref API kullanarak APA formatında atıf çek
                const res = await fetch(`https://doi.org/${response.doi}`, {
                    headers: { 'Accept': 'text/x-bibliography; style=apa' }
                });

                const citation = await res.text();

                // Copyboard panosuna kopyalama işlemi 
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


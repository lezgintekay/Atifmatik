document.addEventListener('DOMContentLoaded', () => {
    const formatSelect = document.getElementById('format');
    const copyBtn = document.getElementById('copyBtn');
    const status = document.getElementById('status');

    // 1. Eklenti her açıldığında hafızada kayıtlı bir stil var mı diye kontrol et
    chrome.storage.local.get(['savedStyle'], (result) => {
        if (result.savedStyle && formatSelect) {
            formatSelect.value = result.savedStyle;
        }
    });

    // 2. Kullanıcı menüden stili her değiştirdiğinde seçimi hafızaya kaydet
    if (formatSelect) {
        formatSelect.addEventListener('change', (e) => {
            chrome.storage.local.set({ savedStyle: e.target.value });
        });
    }

    // 3. Kopyalama butonu ana fonksiyonu
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const selectedStyle = formatSelect.value; 
            status.textContent = "DOI Aranıyor...";

            // Aktif sekme bilgilerini alıyoruz
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // content.js'e mesaj gönderiyoruz
            chrome.tabs.sendMessage(tab.id, { action: "getDOI" }, async (response) => {
                if (response && response.doi) {
                    status.textContent = `${selectedStyle.toUpperCase()} formatında alınıyor...`;

                    try {
                        // Seçilen stile göre atıfı Crossref/DOI üzerinden çekiyoruz
                        const res = await fetch(`https://doi.org/${response.doi}`, {
                            headers: { 
                                'Accept': `text/x-bibliography; style=${selectedStyle}` 
                            }
                        });

                        const citation = await res.text();

                        // Panoya kopyalıyoruz
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
    }
});
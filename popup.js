document.addEventListener("DOMContentLoaded", () => {
    const formatSelect = document.getElementById("format");
    const copyBtn = document.getElementById("copyBtn");
    const status = document.getElementById("status");
    const historyList = document.getElementById("historyList");

    // 1. Eklenti her açıldığında hafızada kayıtlı bir stil var mı diye kontrol et / geçmişi getir
    chrome.storage.local.get(["savedStyle", "citationHistory"], (result) => {
        if (result.savedStyle && formatSelect)
            formatSelect.value = result.savedStyle;
        if (result.citationHistory) renderHistory(result.citationHistory);
    });
    function renderHistory(history) {
        if (!historyList) return; // Eğer historyList elementi yoksa çık

        historyList.innerHTML = ""; // Önceki geçmişi temizle

        history.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = `${item.doi} - ${item.style}`;
            li.style.cursor = "pointer";
            li.onclick = () => {
                navigator.clipboard.writeText(item.citation);
                status.textContent = "Geçmiş atıf kopyalandı!";
            };
            historyList.appendChild(li);
        });
    }

    function addToHistory(newCitation) {
        chrome.storage.local.get(["citationHistory"], (result) => {
            let history = result.citationHistory || [];

            history = [newCitation, ...history].filter(
                (c) => c.doi !== newCitation.doi,
            ); // Aynı DOI'li atıfları temizle
            if (history.length > 5) history.pop(); // Geçmişi 5 ile sınırla
            chrome.storage.local.set({ citationHistory: history }, () => {
                renderHistory(history);
            });
        });
    }

    // 2. Kullanıcı menüden stili her değiştirdiğinde seçimi hafızaya kaydediyoruz
    if (formatSelect) {
        formatSelect.addEventListener("change", (e) => {
            chrome.storage.local.set({ savedStyle: e.target.value });
        });
    }

    // 3. Kopyalama butonu ana fonksiyonu
    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            const selectedStyle = formatSelect.value;
            status.textContent = "DOI Aranıyor...";

            // Aktif sekme bilgilerini alıyoruz
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            // content.js'e mesaj gönderiyoruz
            chrome.tabs.sendMessage(
                tab.id,
                { action: "getDOI" },
                async (response) => {
                    if (response && response.doi) {
                        status.textContent = `${selectedStyle.toUpperCase()} formatında alınıyor...`;

                        try {
                            // Seçilen stile göre atıfı Crossref/DOI üzerinden çekiyoruz
                            const res = await fetch(`https://doi.org/${response.doi}`, {
                                headers: {
                                    Accept: `text/x-bibliography; style=${selectedStyle}`,
                                },
                            });

                            const citation = await res.text();

                            // Panoya kopyalıyoruz
                            await navigator.clipboard.writeText(citation);
                            status.textContent = "Kopyalandı! (CTRL+V yapabilirsin)";
                            // Geçmişe ekliyoruz
                            addToHistory({
                                doi: response.doi,
                                style: selectedStyle,
                                citation: citation,
                            });
                        } catch (err) {
                            status.textContent = "Hata: Atıf çekilemedi.";
                        }
                    } else {
                        status.textContent = "DOI bulunamadı!";
                    }
                },
            );
        });
    }
});

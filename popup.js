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
           const displayTitle = item.title 
            ? (item.title.length > 45 ? item.title.substring(0, 42) + "..." : item.title)
            : item.doi;
            //  li.textContent = `${item.doi} - ${item.style}`;
            //    li.style.cursor = "pointer";
            // li.onclick = () => {
            //     navigator.clipboard.writeText(item.citation);
            //     status.textContent = "Geçmiş atıf kopyalandı!";
            // };

            li.innerHTML = `
            <div style="font-weight: bold; font-size: 11px;">${displayTitle}</div>
            <div style="font-size: 10px; color: #666;">${item.style.toUpperCase()} - ${item.doi.substring(0, 15)}...</div>
        `;
            li.style.padding = "8px"; 
            li.style.borderBottom = "1px solid #eee";
            li.style.cursor = "pointer";
            li.title = item.title; 
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

            history.unshift(newCitation); // Yeni atıfı başa ekle

            if (history.length > 5) history.pop(); // Geçmişi 5 ile sınırla
            console.log("geçmişe ekleniyor", newCitation); // test log
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
                            const resMeta = await fetch('https://api.crossref.org/works/' + response.doi);
                            const metaData = await resMeta.json();
                            const title = metaData.message.title ? metaData.message.title[0] : "Başlık bulunamadı";
                            console.log("meta data", metaData); // test log

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

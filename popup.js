document.addEventListener("DOMContentLoaded", () => {
    const formatSelect = document.getElementById("format");

    //const copyBtn = document.getElementById("copyBtn");
    document.getElementById("copyBtn").textContent = chrome.i18n.getMessage("copyButton");
    
    const status = document.getElementById("status");
    const historyList = document.getElementById("historyList");

    document.getElementById("extNameHeader").textContent = chrome.i18n.getMessage("extName");
    document.getElementById("styleLabel").textContent = chrome.i18n.getMessage("styleLabel");
    document.getElementById("historyHeader").textContent = chrome.i18n.getMessage("historyHeader");



    if (copyBtn) copyBtn.textContent = chrome.i18n.getMessage("copyButton");
    const styleLabel = document.querySelector('label[for="format"]');
    if (styleLabel) styleLabel.textContent = chrome.i18n.getMessage("styleLabel");
    const historyHeader = document.querySelector('.history-connector h4'); 
    if (historyHeader) historyHeader.textContent = chrome.i18n.getMessage("historyHeader");

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
                //status.textContent = "Geçmiş atıf kopyalandı!";
                status.textContent = chrome.i18n.getMessage("historyCopied");
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
            //status.textContent = "DOI Aranıyor...";
                status.textContent = chrome.i18n.getMessage("doiSearching");

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
                        //status.textContent = `${selectedStyle.toUpperCase()} formatında alınıyor...`;
status.textContent = `${selectedStyle.toUpperCase()} ${chrome.i18n.getMessage("fetchingFormat")}`;
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
                            //const title = metaData.message.title ? metaData.message.title[0] : "Başlık bulunamadı";
                            const title = metaData.message.title ? metaData.message.title[0] : chrome.i18n.getMessage("noTitle");
                            console.log("meta data", metaData); // test log

                            // Panoya kopyalıyoruz
                            await navigator.clipboard.writeText(citation);
                            
                            
                            //status.textContent = "Kopyalandı! (CTRL+V yapabilirsin)";
                            status.textContent = chrome.i18n.getMessage("copySuccess");


                            // Geçmişe ekliyoruz
                            addToHistory({
                                doi: response.doi,
                                title: title,
                                style: selectedStyle,
                                citation: citation,
                            });
                        } catch (err) {
                            //status.textContent = "Hata: Atıf çekilemedi.";
                            status.textContent = chrome.i18n.getMessage("errorFetching");
                        }
                    } else {
                        //status.textContent = "DOI bulunamadı!";
                        status.textContent = chrome.i18n.getMessage("doiNotFound");
                    }
                },
            );
        });
    }
});

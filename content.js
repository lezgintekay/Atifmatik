function findDOIOnPage() {
    // Meta Etiketleri kontrolü 
    const meta = document.querySelector('meta[name*="doi"]') ||
        document.querySelector('meta[name*="citation_doi"]');
    if (meta && meta.content) return meta.content.trim();

    // Sayfadaki tüm <a href> etiketlerini kontrol eder
    const links = document.getElementsByTagName('a');
    for (let link of links) {
        const href = link.href;
        const match = href.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
        if (match) return match[0];
    }

    // Hiçbiri yoksa tüm metinde doi numarası arar
    const doiRegex = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
    const bodyMatch = document.body.innerText.match(doiRegex);
    return bodyMatch ? bodyMatch[0] : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDOI") {

        const doi = findDOIOnPage();
        sendResponse({ doi: doi });
    }
    return true;
});
export function getParentDomain(url) {
    // Remove the protocol (http:// or https://) if it exists
    const domain = url.replace(/^https?:\/\//, '').split('/')[0]; // Strip protocol and path

    // Remove leading dot if it exists
    const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;

    // Split the domain into parts (subdomains and the main domain + TLD)
    const domainParts = cleanDomain.split('.');

    // If the domain has more than two parts, assume the last two parts are the parent domain
    if (domainParts.length > 2) {
        return domainParts.slice(domainParts.length - 2).join('.');
    }

    // If it's already a simple domain (e.g., github.com or example.com)
    return cleanDomain;
}
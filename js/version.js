var PAYLOAD_VERSION = '1.0.9';

function withAssetVersion(url) {
  if (!url || /^https?:\/\//i.test(url) || url.indexOf('data:') === 0) return url;
  var separator = url.indexOf('?') === -1 ? '?' : '&';
  return url + separator + 'v=' + encodeURIComponent(PAYLOAD_VERSION);
}

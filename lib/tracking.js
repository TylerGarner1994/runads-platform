export function injectTrackingScript(html, pageId, variantId = null) {
  const apiBase = process.env.API_BASE_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3457');

  const trackingScript = `
<!-- RunAds Landing Pages Tracking -->
<script>
(function() {
  var pageId = '${pageId}';
  var variantId = ${variantId ? `'${variantId}'` : 'null'};
  var apiBase = '${apiBase}';
  var sessionId = 'session_' + Math.random().toString(36).substr(2, 9);

  var params = new URLSearchParams(window.location.search);
  var utmData = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content')
  };

  fetch(apiBase + '/api/track/' + pageId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant_id: variantId, session_id: sessionId, ...utmData })
  }).catch(function() {});

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.tagName === 'FORM') {
      e.preventDefault();
      var formData = new FormData(form);
      var data = { _session_id: sessionId, _variant_id: variantId };
      formData.forEach(function(value, key) { data[key] = value; });
      Object.assign(data, utmData);

      fetch(apiBase + '/api/submit/' + pageId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res) { return res.json(); })
        .then(function(result) {
          if (result.success) {
            var redirectUrl = form.getAttribute('data-redirect') || form.dataset.redirect;
            if (redirectUrl) {
              window.location.href = redirectUrl;
            } else {
              var msg = document.createElement('div');
              msg.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#10b981;color:white;padding:2rem 3rem;border-radius:12px;font-size:1.25rem;z-index:9999;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">Thank you! We\\'ll be in touch soon.</div>';
              document.body.appendChild(msg);
              setTimeout(function() { msg.remove(); }, 3000);
              form.reset();
            }
          }
        }).catch(function() { alert('Something went wrong. Please try again.'); });
    }
  });

  window.trackConversion = function(type, value) {
    fetch(apiBase + '/api/convert/' + pageId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_id: variantId, session_id: sessionId, conversion_type: type || 'conversion', conversion_value: value })
    }).catch(function() {});
  };
})();
</script>
`;

  if (html.includes('</body>')) {
    return html.replace('</body>', trackingScript + '</body>');
  } else if (html.includes('</html>')) {
    return html.replace('</html>', trackingScript + '</html>');
  }
  return html + trackingScript;
}

// Legacy exports for backward compatibility with existing code
export function getTrackingScript(pageId, apiBaseUrl) {
  const base = apiBaseUrl || process.env.API_BASE_URL || '';
  return injectTrackingScript('', pageId).trim();
}

export function injectTracking(html, pageId, apiBaseUrl) {
  return injectTrackingScript(html, pageId);
}

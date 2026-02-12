// RunAds - Tracking Script Injection
// This script is injected into every deployed landing page

export function getTrackingScript(pageId, apiBaseUrl) {
  const base = apiBaseUrl || process.env.API_BASE_URL || '';

  return `
<!-- RunAds Analytics -->
<script>
(function() {
  var RA_PAGE_ID = '${pageId}';
  var RA_API = '${base}';

  // Parse UTM parameters
  function getUTM() {
    var params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      content: params.get('utm_content') || '',
      term: params.get('utm_term') || ''
    };
  }

  // Detect device type
  function getDevice() {
    var ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|mini|palm/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  // Generate session ID
  function getSession() {
    var sid = sessionStorage.getItem('ra_sid');
    if (!sid) {
      sid = 'ra_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('ra_sid', sid);
    }
    return sid;
  }

  // Track page view
  function trackView() {
    var utm = getUTM();
    fetch(RA_API + '/api/track/' + RA_PAGE_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        utm_content: utm.content,
        utm_term: utm.term,
        referrer: document.referrer || '',
        device_type: getDevice(),
        user_agent: navigator.userAgent,
        session_id: getSession(),
        url: window.location.href
      })
    }).catch(function() {});
  }

  // Track conversion
  function trackConversion(eventType, eventValue) {
    var utm = getUTM();
    fetch(RA_API + '/api/convert/' + RA_PAGE_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType || 'conversion',
        event_value: eventValue || null,
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        session_id: getSession()
      })
    }).catch(function() {});
  }

  // Intercept form submissions
  function interceptForms() {
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.tagName !== 'FORM') return;

      // Check for custom redirect
      var redirect = form.getAttribute('data-redirect') || form.getAttribute('data-success-url');

      e.preventDefault();

      var formData = {};
      var inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(function(el) {
        if (el.name) formData[el.name] = el.value;
      });

      var utm = getUTM();
      fetch(RA_API + '/api/submit/' + RA_PAGE_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: formData,
          email: formData.email || formData.Email || '',
          name: formData.name || formData.Name || formData.first_name || '',
          phone: formData.phone || formData.Phone || formData.tel || '',
          utm_source: utm.source,
          utm_medium: utm.medium,
          utm_campaign: utm.campaign,
          utm_content: utm.content,
          utm_term: utm.term,
          referrer: document.referrer || '',
          device_type: getDevice(),
          session_id: getSession()
        })
      }).then(function(res) {
        if (redirect) {
          window.location.href = redirect;
        } else {
          // Default: show success message
          var btn = form.querySelector('button[type="submit"], input[type="submit"]');
          if (btn) {
            var originalText = btn.textContent || btn.value;
            btn.textContent = btn.value = 'Submitted!';
            btn.disabled = true;
            setTimeout(function() {
              btn.textContent = btn.value = originalText;
              btn.disabled = false;
            }, 3000);
          }
        }
      }).catch(function() {
        if (redirect) window.location.href = redirect;
      });
    }, true);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      trackView();
      interceptForms();
    });
  } else {
    trackView();
    interceptForms();
  }

  // Expose for custom tracking
  window.RunAds = {
    track: trackConversion,
    pageId: RA_PAGE_ID
  };
})();
</script>`;
}

// Inject tracking script into HTML before </body>
export function injectTracking(html, pageId, apiBaseUrl) {
  const script = getTrackingScript(pageId, apiBaseUrl);

  if (html.includes('</body>')) {
    return html.replace('</body>', script + '\n</body>');
  }
  // If no body tag, append to end
  return html + script;
}

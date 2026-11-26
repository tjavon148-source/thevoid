// Fetches the key and purchase code for the Stripe session in the URL (?session_id=...). They are created by the Stripe webhook, so it can take a few seconds.
(function () {
  var root = document.getElementById('thanks'); if (!root) return;
  var id = new URLSearchParams(location.search).get('session_id');
  var state = document.getElementById('code-state'), tries = 0;
  function $(x) { return document.getElementById(x); }
  function wire(btn, text, label) { btn.hidden = false; btn.onclick = function () { navigator.clipboard.writeText(text).then(function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 2000); }); }; }
  function fail(msg) { state.textContent = msg; }
  function poll() {
    if (!id) return fail('No payment found on this page. If you just paid, open the link from your receipt, or write to support@gethevoid.com.');
    fetch(root.dataset.api + '/purchase?session_id=' + encodeURIComponent(id), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.status === 'ready') {
          state.textContent = 'Payment confirmed. Thank you.';
          $('code').textContent = d.code; wire($('copy'), d.code, 'Copy code');
          if (d.key) { $('key').textContent = d.key; wire($('copy-key'), d.key, 'Copy key'); }
          else $('key').textContent = 'Your key is not ready here. Claim your code in the Discord, then press Get my key in the downloads channel.';
        } else if (d.status === 'revoked') fail('This purchase was refunded, so the key and code are no longer valid.');
        else if (d.status === 'pending' && ++tries < 20) { state.textContent = 'Confirming your payment...'; setTimeout(poll, 2000); }
        else fail('Your payment is still being confirmed. Wait a minute and refresh this page, or write to support@gethevoid.com.');
      })
      .catch(function () { if (++tries < 20) setTimeout(poll, 3000); else fail('Could not reach the server. Refresh this page, or write to support@gethevoid.com.'); });
  }
  poll();
})();

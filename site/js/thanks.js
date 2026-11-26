// Fetches the purchase code for the Stripe session in the URL (?session_id=...). The code is created by the Stripe webhook, so it can take a few seconds.
(function () {
  var root = document.getElementById('thanks'); if (!root) return;
  var id = new URLSearchParams(location.search).get('session_id');
  var state = document.getElementById('code-state'), out = document.getElementById('code'), copy = document.getElementById('copy');
  var tries = 0;
  function fail(msg) { state.textContent = msg; }
  function poll() {
    if (!id) return fail('No payment found on this page. If you just paid, open the link from your receipt, or write to support@gethevoid.com.');
    fetch(root.dataset.api + '/purchase?session_id=' + encodeURIComponent(id), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.status === 'ready') {
          state.textContent = 'Here it is:'; out.textContent = d.code; copy.hidden = false;
          copy.onclick = function () { navigator.clipboard.writeText(d.code).then(function () { copy.textContent = 'Copied'; }); };
        } else if (d.status === 'revoked') fail('This purchase was refunded, so the code is no longer valid.');
        else if (d.status === 'pending' && ++tries < 20) { state.textContent = 'Confirming your payment...'; setTimeout(poll, 2000); }
        else fail('Your payment is still being confirmed. Wait a minute and refresh this page, or write to support@gethevoid.com.');
      })
      .catch(function () { if (++tries < 20) setTimeout(poll, 3000); else fail('Could not reach the server. Refresh this page, or write to support@gethevoid.com.'); });
  }
  poll();
})();

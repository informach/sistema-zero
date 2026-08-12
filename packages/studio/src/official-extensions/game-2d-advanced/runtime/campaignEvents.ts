/** Roteador único dos acontecimentos emitidos pela campanha. */
export const gameKitCampaignEventsRuntime = `
  function proEmitCampaign(name, payload) {
    var list = proCampaign.listeners[name]; if (!list) return;
    var previousName = proCampaign.eventName; var previousPayload = proCampaign.eventPayload;
    proCampaign.eventName = name; proCampaign.eventPayload = proPlainObject(payload) ? payload : Object.create(null);
    for (var i = 0; i < list.length; i++) try { list[i](payload); } catch (e) { warnOnce('campaign-event:' + name + ':' + i, 'erro no aviso da aventura: ' + e); }
    proCampaign.eventName = previousName; proCampaign.eventPayload = previousPayload;
  }
  function onCampaignEvent(name, fn) {
    var key = proSafeId(name); if (!key || typeof fn !== 'function') return;
    (proCampaign.listeners[key] || (proCampaign.listeners[key] = [])).push(fn);
  }
  function campaignEventValue(field) {
    var key = text(field, '');
    if (key === 'event') return proCampaign.eventName;
    var payload = proCampaign.eventPayload;
    var value = payload && (typeof payload[key] === 'string' || typeof payload[key] === 'number' || typeof payload[key] === 'boolean') ? payload[key] : '';
    return value;
  }
`

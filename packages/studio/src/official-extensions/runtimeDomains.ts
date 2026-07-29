/**
 * Registro compartilhado de domínios dos runtimes de jogo.
 *
 * Cada fragmento roda dentro do IIFE da extensão e mantém o estado no escopo
 * privado daquele motor. Um domínio passa a ser dono do próprio reset/teardown,
 * evitando checklists centrais que precisam conhecer todos os kits existentes.
 */
export const gameRuntimeDomains = `
  var _runtimeDomains = Object.create(null);
  var _runtimeDomainOrder = [];
  function _registerRuntimeDomain(name, hooks) {
    if (!_runtimeDomains[name]) _runtimeDomainOrder.push(name);
    _runtimeDomains[name] = hooks || {};
  }
  function _runRuntimeDomainHook(hookName) {
    var domains = _runtimeDomainOrder.slice();
    for (var i = 0; i < domains.length; i++) {
      var hooks = _runtimeDomains[domains[i]];
      var hook = hooks && hooks[hookName];
      if (typeof hook === 'function') hook();
    }
  }
`

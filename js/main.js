/* Ponto de entrada: liga os handlers de cada tela e inicia o app */

function attachHandlers(){
  attachLayoutHandlers();
  attachCadastroHandlers();
  attachMovimentarHandlers();
  attachDashboardHandlers();
  attachEditarHandlers();
  attachHistoricoHandlers();
  attachConfigHandlers();
  attachAdminHandlers();
}

loadAdmin();
loadData();

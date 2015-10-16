export class App {
  configureRouter(config, router){
    config.title = 'OSSW utils';
    config.map([
      { route: ['','resources'],  name: 'resources',      moduleId: 'resources',      nav: true, title:'Resource builder' }
    ]);

    this.router = router;
  }
}

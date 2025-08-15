import { _decorator, Component, Layout, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DisableLayoutWhenRender')
export class DisableLayoutWhenRender extends Component {
  start() {
    this.scheduleOnce(() => {
      const layout = this.node.getComponent(Layout);
      if (layout) {
        layout.enabled = false;
      }
    });
  }

  update(deltaTime: number) {}
}

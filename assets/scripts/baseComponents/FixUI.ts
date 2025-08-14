import { _decorator, Component, Node, Enum, UITransform, view } from 'cc';
const { ccclass, property } = _decorator;

enum FixType {
  TOP,
  BOTTOM
}

@ccclass('FixUI')
export class FixUI extends Component {
  @property({
    type: Enum(FixType),
    displayName: '固定位置',
    tooltip: '固定位置'
  })
  private fixType: FixType = FixType.TOP;

  @property({
    type: Number,
    displayName: '偏移量',
    tooltip: '偏移量'
  })
  private offset: number = 0;

  onLoad() {
    const viewSize = view.getVisibleSize();
    const uiTransform = this.node.getComponent(UITransform);
    const achorY = uiTransform.anchorPoint.y;
    let uiOffset = 0;

    if (achorY === 0.5) {
      uiOffset = uiTransform.contentSize.height / 2;
    } else if (achorY === 0) {
      uiOffset = uiTransform.contentSize.height;
    } else if (achorY === 1) {
      uiOffset = 0;
    }

    if (this.fixType === FixType.TOP) {
      this.node.setPosition(0, viewSize.height / 2 - uiOffset + this.offset, 0);
    } else {
      this.node.setPosition(
        0,
        -viewSize.height / 2 + uiOffset + this.offset,
        0
      );
    }
  }

  update(deltaTime: number) {}
}

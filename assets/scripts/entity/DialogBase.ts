import {
  _decorator,
  BlockInputEvents,
  CCBoolean,
  CCInteger,
  Component,
  Node,
  tween,
  Vec3,
} from "cc";
const { ccclass, property } = _decorator;

@ccclass("DialogBase")
export class DialogBase extends Component {
  @property(Node)
  contentNode: Node = null;
  @property(Node)
  progressNode: Node = null;
  @property(Node)
  hiddenNodeList: Node[] = [];
  @property([Node])
  exposedNodeList: Node[] = [];
  @property(CCBoolean)
  closeOnTouch: boolean = false;
  @property(CCInteger)
  addedPowerValue: number = 0;
  @property(CCBoolean)
  isResult: boolean = false;

  isOpen: boolean = false;
  isFullyShowed: boolean = false;

  protected onLoad(): void {
    this.hiddenNodeList.forEach((node) => {
      node.active = false;
    });
    // 如果需要点击遮罩关闭弹窗，则禁用遮罩的BlockInputEvents组件
    if (this.closeOnTouch) {
      const maskNode = this.node.children[0];
      const blockInputEvents = maskNode?.getComponent(BlockInputEvents);
      if (blockInputEvents) {
        blockInputEvents.enabled = false;
      }
    }
  }

  protected async onEnable(): Promise<void> {
    await this.openDialog();
  }

  protected onDisable(): void {
    this.closeDialog();
  }

  getExposedNodeList(): Node[] {
    return this.exposedNodeList;
  }

  /**
   * 打开弹窗
   */
  openDialog(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isOpen) {
        resolve();
        return;
      }

      this.isOpen = true;
      this.node.active = true;

      // 重置缩放
      this.contentNode.setScale(0, 0, 0);

      // 执行缩放动画
      tween(this.contentNode)
        .to(
          0.4,
          { scale: new Vec3(1, 1, 1) },
          {
            easing: "backOut", // 使用弹性缓动效果，让动画更自然
          }
        )
        .call(() => {
          this.isFullyShowed = true;
          resolve();
        })
        .start();
    });
  }

  /**
   * 关闭弹窗
   */
  closeDialog(): Promise<void> {
    return new Promise((resolve) => {
      this.isOpen = false;
      this.isFullyShowed = false;
      this.node.active = false;
      this.contentNode.setScale(0, 0, 0);
      resolve();
    });
  }
}

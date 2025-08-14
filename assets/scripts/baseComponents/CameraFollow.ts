import { _decorator, Component, Node, UITransform, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
  @property({
    type: Node,
    displayName: '跟随目标',
    tooltip: '跟随目标'
  })
  private target: Node = null;

  @property({
    type: Node,
    displayName: '限制区域',
    tooltip: '限制区域'
  })
  nodeLimitArea: Node = null;

  @property({
    type: Number,
    displayName: '平滑速度',
    tooltip: '平滑速度'
  })
  private smoothSpeed: number = 0.125;

  @property({
    type: Vec3,
    displayName: '偏移量',
    tooltip: '偏移量'
  })
  private offset: Vec3 = new Vec3(0, 0, 0);

  @property({
    type: Boolean,
    displayName: 'X轴不跟随',
    tooltip: 'X轴不跟随'
  })
  private isLimitX: boolean = false;

  @property({
    type: Boolean,
    displayName: 'Y轴不跟随',
    tooltip: 'Y轴不跟随'
  })
  private isLimitY: boolean = false;

  private currentVelocity: Vec3 = new Vec3();

  _limitCameraArea: {
    x: {
      min: number;
      max: number;
    };
    y: {
      min: number;
      max: number;
    };
  } = {
    x: {
      min: 0,
      max: 0
    },
    y: {
      min: 0,
      max: 0
    }
  };

  start() {
    if (!this.target) {
      console.warn('CameraFollow: Target node is not set!');
      return;
    }

    if (this.nodeLimitArea) {
      const nodeLimitArea = this.nodeLimitArea;
      const viewSize = view.getVisibleSize();

      const uiTransform = nodeLimitArea.getComponent(UITransform);

      this._limitCameraArea.x.min =
        viewSize.width / 2 -
        uiTransform.contentSize.width / 2 +
        nodeLimitArea.position.x;
      this._limitCameraArea.x.max =
        -viewSize.width / 2 +
        uiTransform.contentSize.width / 2 +
        nodeLimitArea.position.x;
      this._limitCameraArea.y.min =
        viewSize.height / 2 -
        uiTransform.contentSize.height / 2 +
        nodeLimitArea.position.y;
      this._limitCameraArea.y.max =
        -viewSize.height / 2 +
        uiTransform.contentSize.height / 2 +
        nodeLimitArea.position.y;

      console.log(this._limitCameraArea);
    }
  }

  update(deltaTime: number) {
    if (!this.target) return;

    const targetPosition = this.target.getWorldPosition();
    const desiredPosition = new Vec3(
      targetPosition.x + this.offset.x,
      targetPosition.y + this.offset.y,
      targetPosition.z + this.offset.z
    );

    // 使用 lerp 进行平滑插值
    const smoothedPosition = new Vec3();
    Vec3.lerp(
      smoothedPosition,
      this.node.getWorldPosition(),
      desiredPosition,
      this.smoothSpeed
    );

    //把世界坐标转换为本地坐标
    const localPosition = this.node.parent
      .getComponent(UITransform)
      .convertToNodeSpaceAR(smoothedPosition);
    if (this.nodeLimitArea) {
      localPosition.x = Math.min(
        Math.max(localPosition.x, this._limitCameraArea.x.min),
        this._limitCameraArea.x.max
      );
      localPosition.y = Math.min(
        Math.max(localPosition.y, this._limitCameraArea.y.min),
        this._limitCameraArea.y.max
      );
    }
    this.node.setPosition(
      this.isLimitX ? this.node.position.x : localPosition.x,
      this.isLimitY ? this.node.position.y : localPosition.y,
      localPosition.z
    );
  }
}

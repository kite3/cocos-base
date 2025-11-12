import {
  _decorator,
  Component,
  Node,
  Vec2,
  find,
  Vec3,
  UITransform,
  view
} from 'cc';
const { ccclass, property } = _decorator;
import { globalEvent, GlobalEvent } from '../global';
@ccclass('JoystickTarget')
export class JoystickTarget extends Component {
  @property(Node)
  nodeLimitArea: Node = null;

  _initPos: {
    x: number;
    y: number;
    z: number;
  } = { x: 0, y: 0, z: 0 };
  _playerSpeed: number = 400;

  _camera: Node = null;

  private _smoothTime: number = 0.1;
  private _tempVec3: Vec3 = new Vec3();

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

  _limitPlayerArea: {
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

  onLoad() {
    this._initPos = this.node.position.clone();

    this._camera = find('Canvas/Camera');

    if (this.nodeLimitArea) {
      const nodeLimitArea = this.nodeLimitArea;
      const viewSize = view.getVisibleSize();

      const uiTransform = nodeLimitArea.getComponent(UITransform);
      const nodeUiTransform = this.node.getComponent(UITransform);

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

      this._limitPlayerArea.x.min =
        this._limitCameraArea.x.min -
        viewSize.width / 2 +
        nodeUiTransform.contentSize.width / 2;
      this._limitPlayerArea.x.max =
        this._limitCameraArea.x.max +
        viewSize.width / 2 -
        nodeUiTransform.contentSize.width / 2;
      this._limitPlayerArea.y.min =
        this._limitCameraArea.y.min -
        viewSize.height / 2 +
        nodeUiTransform.contentSize.height / 2;
      this._limitPlayerArea.y.max =
        this._limitCameraArea.y.max +
        viewSize.height / 2 -
        nodeUiTransform.contentSize.height / 2;
    }
  }

  start() {
    globalEvent.on(GlobalEvent.JOYSTICK_TOUCH_START, () => {
      console.log('JOYSTICK_TOUCH_START');
    });
    globalEvent.on(GlobalEvent.JOYSTICK_TOUCH_END, () => {
      console.log('JOYSTICK_TOUCH_END');
    });
    globalEvent.on(
      GlobalEvent.JOYSTICK_MOVE,
      ({ moveDir, deltaTime }: { moveDir: Vec2; deltaTime: number }) => {
        this.playMove(moveDir, deltaTime);
      }
    );
  }

  update(deltaTime: number) {}

  playMove(moveDir: Vec2, deltaTime: number) {
    // 计算新位置
    const curPos = this.node.getPosition();
    let newX = curPos.x + moveDir.x * this._playerSpeed * deltaTime;
    let newY = curPos.y + moveDir.y * this._playerSpeed * deltaTime;

    if (this.nodeLimitArea) {
      newX = Math.min(
        Math.max(newX, this._limitPlayerArea.x.min),
        this._limitPlayerArea.x.max
      );
      newY = Math.min(
        Math.max(newY, this._limitPlayerArea.y.min),
        this._limitPlayerArea.y.max
      );
    }
    // 更新玩家位置
    this.node.setPosition(newX, newY, curPos.z);

    const playerPos = this.node.position;

    let targetPosition = {
      x: playerPos.x - this._initPos.x,
      y: playerPos.y - this._initPos.y,
      z: this.node.position.z
    };
    if (this.nodeLimitArea) {
      targetPosition = {
        x: Math.min(
          Math.max(playerPos.x - this._initPos.x, this._limitCameraArea.x.min),
          this._limitCameraArea.x.max
        ),
        y: Math.min(
          Math.max(playerPos.y - this._initPos.y, this._limitCameraArea.y.min),
          this._limitCameraArea.y.max
        ),
        z: this.node.position.z
      };
    }

    // 更新相机位置
    this._camera.setPosition(
      targetPosition.x,
      targetPosition.y,
      targetPosition.z
    );
  }
}

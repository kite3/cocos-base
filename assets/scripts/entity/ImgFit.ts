import { _decorator, Component, Node, Sprite } from 'cc';
import { getContentSizeWithScale } from '../utils/common';

const { ccclass, property } = _decorator;

@ccclass('imgFit')
export class imgFit extends Component {
  @property({ type: Node })
  containerNode: Node = null;

  start() {
    this.fitImg();
    this.node.on('fitImg', this.fitImg, this);
  }

  fitImg() {
    // 图片所在节点的宽高
    const orginWH = getContentSizeWithScale(this.node);
    // 容器节点的宽高
    const targetWH = getContentSizeWithScale(this.containerNode);
    console.log(
      '[imgFit] targetWH',
      JSON.stringify(targetWH),
      'orginWH',
      JSON.stringify(orginWH)
    );
    const scale = Math.max(
      targetWH.width / orginWH.width,
      targetWH.height / orginWH.height
    );
    console.log(
      '[imgFit] widthRate',
      targetWH.width / orginWH.width,
      'heightRate',
      targetWH.height / orginWH.height,
      'scale' + scale
    );
    this.node.setScale(scale, scale, 1);
  }
}

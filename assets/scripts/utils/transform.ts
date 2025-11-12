import { Camera, find, tween, Vec3, Node, TweenEasing } from 'cc';

export function scaleAndMoveY(
  node: Node,
  duration: number = 0.5,
  offsetY: number = 0,
  initScale: Vec3 = new Vec3(0, 0, 1),
  targetScale?: Vec3
) {
  return Promise.all([
    scaleAnim({
      node,
      duration,
      initScale,
      targetScale
    }),
    moveAnim({
      node,
      duration,
      initPosition: new Vec3(node.position.x, node.position.y, 0),
      targetPosition: new Vec3(node.position.x, node.position.y + offsetY, 0)
    })
  ]);
}

export function scaleAndMoveX(
  node: Node,
  duration: number = 0.5,
  offsetX: number = 0,
  initScale: Vec3 = new Vec3(0, 0, 1),
  targetScale?: Vec3
) {
  return Promise.all([
    scaleAnim({
      node,
      duration,
      initScale,
      targetScale
    }),
    moveAnim({
      node,
      duration,
      initPosition: new Vec3(node.position.x, node.position.y, 0),
      targetPosition: new Vec3(node.position.x + offsetX, node.position.y, 0)
    })
  ]);
}

export function scaleAndMoveXY(
  node: Node,
  duration: number = 0.5,
  offsetX: number = 0,
  offsetY: number = 0,
  initScale: Vec3 = new Vec3(0, 0, 1),
  targetScale?: Vec3
) {
  return Promise.all([
    scaleAnim({
      node,
      duration,
      initScale,
      targetScale
    }),
    moveAnim({
      node,
      duration,
      initPosition: new Vec3(node.position.x, node.position.y, 0),
      targetPosition: new Vec3(
        node.position.x + offsetX,
        node.position.y + offsetY,
        0
      )
    })
  ]);
}

export function moveNodeY(
  node: Node,
  duration: number = 0.5,
  offsetY: number = 0
) {
  return moveAnim({
    node,
    duration,
    initPosition: new Vec3(node.position.x, node.position.y, 0),
    targetPosition: new Vec3(node.position.x, node.position.y + offsetY, 0)
  });
}

export function moveNodeX(
  node: Node,
  duration: number = 0.5,
  offsetX: number = 0
) {
  return moveAnim({
    node,
    duration,
    initPosition: new Vec3(node.position.x, node.position.y, 0),
    targetPosition: new Vec3(node.position.x + offsetX, node.position.y, 0)
  });
}

export function scaleNodeY(
  node: Node,
  duration: number = 0.5,
  initScaleY: number = 0,
  targetScaleY: number = 1
) {
  const originScale = node.getScale().clone();
  return scaleAnim({
    node,
    duration,
    initScale: new Vec3(originScale.x, initScaleY, 1),
    targetScale: new Vec3(originScale.x, targetScaleY, 1)
  });
}

export function scaleNodeX(
  node: Node,
  duration: number = 0.5,
  initScaleX: number = 0,
  targetScaleX: number = 1
) {
  const originScale = node.getScale().clone();
  return scaleAnim({
    node,
    duration,
    initScale: new Vec3(initScaleX, originScale.y, 1),
    targetScale: new Vec3(targetScaleX, originScale.y, 1)
  });
}

/**
 * 位移动画
 * @param param0
 * @returns
 */
export function moveAnim({
  node,
  duration = 0.5,
  initPosition = new Vec3(0, 0, 0),
  targetPosition = new Vec3(0, 0, 0),
  easing = 'quadOut'
}: {
  node: Node;
  duration?: number;
  initPosition?: Vec3;
  targetPosition?: Vec3;
  easing?: TweenEasing;
}) {
  return new Promise((resolve, reject) => {
    node.active = true;
    node.setPosition(initPosition.x, initPosition.y, 0);
    tween(node)
      .to(duration, { position: targetPosition }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
}

/**
 * 缩放动画
 * @param param0
 * @returns
 */
export function scaleAnim({
  node,
  duration = 0.5,
  initScale = new Vec3(0, 0, 1),
  targetScale = new Vec3(1, 1, 1),
  easing = 'quadOut'
}: {
  node: Node;
  duration?: number;
  initScale?: Vec3;
  targetScale?: Vec3;
  easing?: TweenEasing;
}) {
  return new Promise((resolve, reject) => {
    node.active = true;
    if (!targetScale) {
      targetScale = node.getScale().clone();
    }
    node.setScale(initScale.x, initScale.y, 1);
    tween(node)
      .to(duration, { scale: targetScale }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
}

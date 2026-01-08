import {
  Button,
  instantiate,
  Label,
  Node,
  Prefab,
  randomRangeInt,
  Sprite,
  tween,
  TweenEasing,
  UITransform,
  Vec3
} from 'cc';
import { getUIOpacity, sleep } from './common';
import { scaleAnim, moveNodeY, moveAnim } from './transform';

export function fadeIn(node: Node, duration = 0.4) {
  return new Promise((resolve, reject) => {
    if (!node) {
      console.warn('[fadeIn]节点为空');
      resolve('');
      return;
    }
    if (!node.isValid) {
      console.warn('[fadeIn]节点已销毁', node.name);
      resolve('');
      return;
    }
    node.active = true;
    const uiOpacity = getUIOpacity(node);
    uiOpacity.opacity = 0;
    tween(uiOpacity)
      .to(
        duration,
        {
          opacity: 255
        },
        {
          easing: 'quadOut'
        }
      )
      .call(() => {
        resolve('');
      })
      .start();
  });
}

export function fadeOutNode(node: Node, duration = 0.4, isDestroy = true) {
  if (!node) {
    console.warn('[fadeOut]节点为空');
    return Promise.resolve();
  }
  if (!node.isValid) {
    console.warn('[fadeOut]节点已销毁', node.name);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const uiOpacity = getUIOpacity(node);
    tween(uiOpacity)
      .to(
        duration,
        {
          opacity: 0
        },
        {
          easing: 'quadOut'
        }
      )
      .call(() => {
        if (isDestroy) {
          node.destroy();
        } else {
          node.active = false;
        }
        resolve('');
      })
      .start();
  });
}

export function scaleIn(
  node: Node,
  duration: number = 0.4,
  easing: TweenEasing = 'quadOut'
) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const originScale = node.scale.clone();
    node.setScale(0, 0, 1);
    tween(node)
      .to(duration, { scale: originScale }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
}

export function scaleInBounce(
  node: Node,
  duration: number = 0.5,
  overshoot: number = 1.2
) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const originScale = node.scale.clone();
    const overshootScale = new Vec3(
      originScale.x * overshoot,
      originScale.y * overshoot,
      originScale.z
    );

    node.setScale(0, 0, 0);

    tween(node)
      .to(duration * 0.6, { scale: overshootScale }, { easing: 'quadOut' })
      .to(duration * 0.4, { scale: originScale }, { easing: 'backOut' })
      .call(() => {
        resolve('');
      })
      .start();
  });
}

export const movePointAToPointB = (
  node: Node,
  startPos: Vec3,
  endPos: Vec3,
  duration = 0.3,
  easing: TweenEasing = 'sineInOut'
) => {
  return new Promise(resolve => {
    node.active = true;
    node.setPosition(startPos);

    tween(node)
      .to(duration, { position: endPos }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
};

export const moveNodeAToNodeB = (
  startNode: Node,
  endNode: Node,
  duration = 0.5,
  easing: TweenEasing = 'sineInOut'
) => {
  return new Promise(resolve => {
    startNode.active = true;
    const endPos = startNode.parent
      .getComponent(UITransform)
      .convertToNodeSpaceAR(endNode.worldPosition);
    tween(startNode)
      .to(duration, { position: endPos }, { easing })
      .call(() => {
        resolve('');
      })
      .start();
  });
};

/**
 * 伤害数值出现特效: 放大 + 上移 --> 缩小 + 上移 --> 渐变消失
 * @param hitNumberNode 伤害数值节点
 * @param container 伤害数值容器节点
 * @param centerNode 中心节点(伤害数值的起始位置)
 */
export async function doubleScaleAndMoveForHitNumber({
  hitNumberNode,
  hitValue,
  container,
  centerNode
}: {
  hitNumberNode: Node;
  hitValue: number;
  container?: Node;
  centerNode?: Node;
}) {
  if (container) {
    container.addChild(hitNumberNode);
  }

  if (centerNode) {
    // 设置初始位置
    const centerWorldPos = centerNode.getWorldPosition();
    const localPos = container
      .getComponent(UITransform)
      .convertToNodeSpaceAR(centerWorldPos);
    hitNumberNode.setPosition(localPos);
  }

  // 获取当前攻击力数值
  const labelComponent = hitNumberNode.getComponent(Label);
  if (labelComponent) {
    labelComponent.string = hitValue.toString();
  } else {
    console.warn('[怪物] 伤害数值节点上找不到Label组件');
  }

  // 动画序列：
  // 1. 第一阶段：放大 + 上移
  const phase1Duration = 0.5;
  const phase1MoveY = 100;
  const phase1Scale = new Vec3(1.25, 1.25, 1);

  // 2. 第二阶段：缩小 + 上移
  const phase2Duration = 0.5;
  const phase2MoveY = 80;
  const phase2Scale = new Vec3(0.75, 0.75, 1);

  // 3. 第三阶段：渐变消失
  const phase3Duration = 0.2;

  try {
    // 第一阶段：放大并上移
    await Promise.all([
      scaleAnim({
        node: hitNumberNode,
        duration: phase1Duration,
        initScale: new Vec3(0.3, 0.3, 1),
        targetScale: phase1Scale,
        easing: 'backOut'
      }),
      moveNodeY(hitNumberNode, phase1Duration, phase1MoveY)
    ]);

    // 第二阶段：缩小并继续上移
    await Promise.all([
      scaleAnim({
        node: hitNumberNode,
        duration: phase2Duration,
        initScale: phase1Scale,
        targetScale: phase2Scale,
        easing: 'quadOut'
      }),
      moveNodeY(hitNumberNode, phase2Duration, phase2MoveY)
    ]);

    // 第三阶段：渐变消失
    await fadeOutNode(hitNumberNode, phase3Duration, true);
  } catch (error) {
    console.error('[怪物] 伤害数值动画执行错误:', error);
    // 确保节点被销毁
    if (hitNumberNode && hitNumberNode.isValid) {
      hitNumberNode.destroy();
    }
  }
}

async function _startValueAnimation({
  valuePrefab,
  parentNode,
  initY,
  targetY,
  duration
}: {
  valuePrefab: Prefab;
  parentNode: Node;
  initY: number;
  targetY: number;
  duration: number;
}) {
  const valueNode = instantiate(valuePrefab);
  valueNode.parent = parentNode;
  valueNode.setPosition(0, initY, 0);
  await moveAnim({
    node: valueNode,
    duration,
    initPosition: new Vec3(0, initY, 0),
    targetPosition: new Vec3(0, targetY, 0),
    easing: 'linear'
  });
  await fadeOutNode(valueNode, duration);
}

/**
 * 宗门试玩中常见的修改+n微动画
 * 色值：2CDA35
 * 字号：22
 * 描边：#000, 1px
 * @param param0
 * @returns
 */
export async function xiuweiAnimation({
  valuePrefab,
  parentNode,
  initY = -40,
  targetY = 40,
  duration = 0.7,
  interval = 0.5
}: {
  valuePrefab: Prefab;
  parentNode: Node;
  initY?: number;
  targetY?: number;
  duration?: number;
  interval?: number;
}) {
  const timer = setInterval(() => {
    _startValueAnimation({ valuePrefab, parentNode, initY, targetY, duration });
  }, interval * 1000);
  return timer;
}

/**
 * 高度过渡动画，例如mask遮罩的高度过渡
 * @param node 节点
 * @param initHeight 初始高度
 * @param destHeight 目标高度
 * @param duration 动画时长
 * @param easing 动画缓动函数
 * @returns
 */
export function transitionHeight({
  node,
  initHeight,
  destHeight,
  duration = 0.4,
  easing = 'linear'
}: {
  node: Node;
  initHeight: number;
  destHeight?: number;
  duration?: number;
  easing?: TweenEasing;
}): Promise<void> {
  return new Promise(resolve => {
    const uiTransform = node.getComponent(UITransform);
    if (!destHeight) {
      destHeight = uiTransform.height;
    }
    const heightObj = { height: initHeight };
    tween(heightObj)
      .to(
        duration,
        { height: destHeight },
        {
          easing,
          onUpdate: () => {
            uiTransform.height = heightObj.height;
          }
        }
      )
      .call(() => {
        resolve();
      })
      .start();
  });
}

// 透明闪烁效果（用于告警）
export async function fadeFlash(
  node: Node,
  count: number = 2,
  duration = 0.5,
  delay = 0.4
) {
  for (let i = 0; i < count; i++) {
    await fadeIn(node, duration);
    await fadeOutNode(node, duration, false);
    await sleep(delay);
  }
}

/**
 * 躲避动作（后退，伴随透明度变化和缩放效果）
 * @param node 要执行躲避的节点
 * @param avoidDistance 后退距离，默认160
 * @param avoidDuration 后退时间，默认0.28
 * @param scaleNode 可选，用于缩放效果的节点（默认不使用）
 */
export async function avoidAction(
  node: Node,
  avoidDistance: number = 160,
  avoidDuration: number = 0.28,
  scaleNode?: Node
): Promise<void> {
  const uiOpacity = getUIOpacity(node);

  const currentPos = node.position.clone();
  const targetPos = new Vec3(
    currentPos.x - avoidDistance,
    currentPos.y,
    currentPos.z
  );

  tween(node).to(avoidDuration, { position: targetPos }).start();

  tween(uiOpacity)
    .to(avoidDuration * 0.3, { opacity: 100 })
    .delay(avoidDuration * 0.4)
    .to(avoidDuration * 0.3, { opacity: 255 })
    .start();

  if (scaleNode) {
    const sprite = scaleNode.getComponent(Sprite);
    if (sprite) {
      tween(scaleNode)
        .to(avoidDuration * 0.3, { scale: new Vec3(0.95, 0.95, 1) })
        .delay(avoidDuration * 0.4)
        .to(avoidDuration * 0.3, { scale: new Vec3(1, 1, 1) })
        .start();
    }
  }

  await sleep(avoidDuration);
}

/**
 * 点击弹窗卡片，选中卡片最终放大，未选中卡片最终缩小
 * 卡片Button组件需设置transition=NONE
 * @param selectedCard 选中卡片，通过event.target获取
 */
export async function playCardSelectAnimation(
  selectedCard,
  minScale = 0.8,
  maxScale = 1.2,
  duration = 0.25
): Promise<void> {
  const cardA = selectedCard;
  const cardB = selectedCard.parent.children.find(
    child => child !== selectedCard
  );

  // 避免重复点击
  cardA.getComponent(Button).interactable = false;
  cardB.getComponent(Button).interactable = false;

  if (cardA && cardB) {
    const originalScaleA = cardA.getScale().clone();
    const parsedMinScale = originalScaleA.x * minScale;
    const parsedMaxScale = originalScaleA.x * maxScale;

    await new Promise(resolve => {
      tween(cardA)
        .to(duration, { scale: new Vec3(parsedMinScale, parsedMinScale, 1) })
        .call(() => {
          tween(cardA)
            .to(duration, {
              scale: new Vec3(parsedMaxScale, parsedMaxScale, 1)
            })
            .start();

          cardB.getComponent(Sprite).grayscale = true;
          tween(cardB)
            .to(duration, {
              scale: new Vec3(parsedMinScale, parsedMinScale, 1)
            })
            .call(() => {
              resolve(null);
            })
            .start();
        })
        .start();
    });
  }
}

/**
 * 钟摆式摇晃效果 - 围绕锚点进行旋转式摇晃
 * @param node 要摇晃的节点
 * @param shakeAngle 摇晃角度（度），默认15度
 * @param shakeDuration 单次摇晃时长（秒），默认0.2秒
 * @param shakeCount 摇晃次数（左右摇晃的总次数），默认2次
 * @param easing 缓动类型，默认'sineInOut'
 * @returns Promise，摇晃完成时resolve
 */
export function shakeRotation(
  node: Node,
  shakeAngle: number = 15,
  shakeDuration: number = 0.2,
  shakeCount: number = 2,
  easing: TweenEasing = 'sineInOut'
): Promise<void> {
  return new Promise(resolve => {
    if (!node || !node.isValid) {
      console.warn('[shakeRotation] 节点无效');
      resolve();
      return;
    }

    // 记录原始旋转角度
    const originalRotation = node.angle;

    // 创建扇形摇晃动画序列
    let shakeSequence = tween(node);

    for (let i = 0; i < shakeCount; i++) {
      // 向右旋转摇晃
      shakeSequence = shakeSequence.to(
        shakeDuration,
        {
          angle: originalRotation + shakeAngle
        },
        { easing }
      );

      // 向左旋转摇晃
      shakeSequence = shakeSequence.to(
        shakeDuration,
        {
          angle: originalRotation - shakeAngle
        },
        { easing }
      );
    }

    // 最后回到原始角度
    shakeSequence = shakeSequence
      .to(
        shakeDuration,
        {
          angle: originalRotation
        },
        { easing }
      )
      .call(() => {
        resolve();
      });

    // 开始摇晃动画
    shakeSequence.start();
  });
}

/**
 * 打字机效果
 * @param label
 * @param speed
 * @returns
 */
export function typewriterEffect(
  label: Label,
  speed: number = 0.05
): Promise<void> {
  return new Promise(resolve => {
    const uiTransform = label.node.getComponent(UITransform);
    const originalAnchorX = uiTransform.anchorX;
    const originalPosition = label.node.position.clone();
    const text = label.string;

    label.string = '';
    uiTransform.anchorX = 0;

    const offsetX =
      (uiTransform.anchorX - originalAnchorX) * uiTransform.contentSize.width;
    label.node.setPosition(
      originalPosition.x + offsetX,
      originalPosition.y,
      originalPosition.z
    );

    let index = 0;

    setTimeout(() => {
      fadeIn(label.node, 0.01);
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          label.string += text[index];
          index++;
        } else {
          clearInterval(typeInterval);
          resolve();
        }
      }, speed * 1000);
    });
  });
}

/**
 * 左右来回位移
 * @param node
 * @param distance
 * @param duration
 * @returns
 */
export function shakeMoveInfinite(
  node: Node,
  distance: number = 20,
  duration: number = 0.5
): () => void {
  const originalX = node.position.x;

  const shakeTween = tween(node)
    .to(duration, {
      position: new Vec3(originalX + distance, node.position.y, node.position.z)
    })
    .to(duration, {
      position: new Vec3(originalX - distance, node.position.y, node.position.z)
    })
    .union()
    .repeatForever()
    .start();

  return () => {
    shakeTween.stop();
  };
}

/**
 * Label数值过渡动画，从当前数值平滑过渡到目标数值
 * @param label Label组件
 * @param targetValue 目标数值
 * @param initValue 初始数值（如果不提供，则从label.string解析）
 * @param duration 动画时长
 * @param easing 动画缓动函数
 * @param formatFn 格式化函数，用于自定义数值显示格式（默认取整）
 * @returns
 */
export function transitionLabelValue({
  label,
  targetValue,
  initValue,
  duration = 0.5,
  easing = 'linear',
  formatFn
}: {
  label: Label;
  targetValue: number;
  initValue?: number;
  duration?: number;
  easing?: TweenEasing;
  formatFn?: (value: number) => string;
}): Promise<void> {
  return new Promise(resolve => {
    if (!label || !label.isValid) {
      resolve();
      return;
    }

    // 如果没有提供初始值，尝试从label.string解析
    let startValue = initValue;
    if (startValue === undefined) {
      const currentString = label.string || '0';
      const parsed = parseFloat(currentString.replace(/[^\d.-]/g, ''));
      startValue = isNaN(parsed) ? 0 : parsed;
    }

    // 默认格式化函数：取整
    const defaultFormatFn = (value: number) => Math.floor(value).toString();
    const format = formatFn || defaultFormatFn;

    const valueObj = { value: startValue };
    tween(valueObj)
      .to(
        duration,
        { value: targetValue },
        {
          easing,
          onUpdate: () => {
            if (label && label.isValid) {
              label.string = format(valueObj.value);
            }
          }
        }
      )
      .call(() => {
        // 确保最终值准确
        if (label && label.isValid) {
          label.string = format(targetValue);
        }
        resolve();
      })
      .start();
  });
}

/**
 * 贝塞尔曲线飞行动画（二次贝塞尔曲线，形成抛物线效果）
 * @param node 要移动的节点
 * @param startPos 起始位置
 * @param endPos 结束位置
 * @param height 控制点高度（相对于起点和终点中点的Y轴偏移）
 * @param duration 动画时长
 * @param easing 缓动函数
 * @param onProgress 进度回调，参数为进度值(0-1)
 * @returns Promise，动画完成时resolve
 */
export function bezierCurveFly({
  node,
  startPos,
  endPos,
  height = 200,
  duration = 1.0,
  easing = 'sineInOut',
  onProgress
}: {
  node: Node;
  startPos: Vec3;
  endPos: Vec3;
  height?: number;
  duration?: number;
  easing?: TweenEasing;
  onProgress?: (progress: number) => void;
}): Promise<void> {
  return new Promise(resolve => {
    if (!node || !node.isValid) {
      resolve();
      return;
    }

    // 计算控制点（在起点和终点的中点上方）
    const midX = (startPos.x + endPos.x) / 2;
    const midY = (startPos.y + endPos.y) / 2;
    const controlPoint = new Vec3(midX, midY + height, startPos.z);

    // 设置初始位置
    node.active = true;
    node.setPosition(startPos);

    // 二次贝塞尔曲线公式: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    // P₀ = startPos, P₁ = controlPoint, P₂ = endPos
    const progressObj = { t: 0 };
    tween(progressObj)
      .to(
        duration,
        { t: 1 },
        {
          easing,
          onUpdate: () => {
            if (!node || !node.isValid) {
              return;
            }
            const t = progressObj.t;
            // 计算贝塞尔曲线上的点
            const oneMinusT = 1 - t;
            const x =
              oneMinusT * oneMinusT * startPos.x +
              2 * oneMinusT * t * controlPoint.x +
              t * t * endPos.x;
            const y =
              oneMinusT * oneMinusT * startPos.y +
              2 * oneMinusT * t * controlPoint.y +
              t * t * endPos.y;
            const z =
              oneMinusT * oneMinusT * startPos.z +
              2 * oneMinusT * t * controlPoint.z +
              t * t * endPos.z;

            node.setPosition(x, y, z);

            if (onProgress) {
              onProgress(t);
            }
          }
        }
      )
      .call(() => {
        // 确保最终位置准确
        if (node && node.isValid) {
          node.setPosition(endPos);
        }
        resolve();
      })
      .start();
  });
}

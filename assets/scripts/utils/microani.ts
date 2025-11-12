import {
  instantiate,
  Label,
  Node,
  Prefab,
  randomRangeInt,
  tween,
  TweenEasing,
  UITransform,
  Vec3
} from 'cc';
import { fadeOutNode } from './common';
import { scaleAnim, moveNodeY, moveAnim } from './transform';

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
  container: Node;
  centerNode: Node;
}) {
  container.addChild(hitNumberNode);

  // 设置初始位置
  const centerWorldPos = centerNode.getWorldPosition();
  const localPos = container
    .getComponent(UITransform)
    .convertToNodeSpaceAR(centerWorldPos);
  hitNumberNode.setPosition(localPos);

  // 获取当前攻击力数值
  const labelComponent = hitNumberNode.getComponent(Label);
  if (labelComponent) {
    labelComponent.string = hitValue.toString();
  } else {
    console.warn('[怪物] 伤害数值节点上找不到Label组件');
  }

  // 动画序列：
  // 1. 第一阶段：放大 + 上移
  const phase1Duration = 0.3;
  const phase1MoveY = 100;
  const phase1Scale = new Vec3(1.25, 1.25, 1);

  // 2. 第二阶段：缩小 + 上移
  const phase2Duration = 0.3;
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

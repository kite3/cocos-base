import {
  UITransform,
  Size,
  view,
  Prefab,
  instantiate,
  Vec3,
  TweenEasing,
  UIOpacity,
  tween,
  Node,
  Animation,
  find,
  Widget,
  sp,
  sys,
  Component,
  Layout,
  Vec2,
  Collider2D,
  Button,
  EventHandler,
  AnimationClip,
  Sprite,
} from "cc";
import { playOneShot } from "../baseManager/AudioManager";
import { AUDIO_ENUM } from "../global";

declare const wx: any;

export function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

export function handleGameOver() {
  try {
    wx?.notifyMiniProgramPlayableStatus?.({
      isEnd: true,
      success: () => {
        console.log("[wx] notifyMiniProgramPlayableStatus成功回调被触发");
      },
      fail: (err) => {
        console.log("[wx] notifyMiniProgramPlayableStatus失败回调被触发:", err);
      },
    });
  } catch (err) {
    console.log("[wx] notifyMiniProgramPlayableStatus失败:", err);
  }
  console.warn("[game] over");
}

export function isWeb() {
  return typeof window !== "undefined" && !window["wx"];
}

export function isWebDevelopment() {
  const isCocosEditor = location.href.indexOf("packages://scene/static") > -1;
  console.log("isCocosEditor", isCocosEditor);
  return isWeb() && (location.href.indexOf("localhost") > -1 || isCocosEditor);
}

export function isDebugMode() {
  return isWeb() && location.href.indexOf("debug=1") > -1;
}

export const getContentSizeWithScale = (node: Node) => {
  let size = node.getComponent(UITransform).contentSize;
  return new Size(size.width * node.scale.x, size.height * node.scale.y);
};

export const getRandomInRange = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  // 生成闭区间 [min, max] 内的随机整数
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 显示手指引导
 * @param prefab 手指预制体
 * @param targetNode 目标节点
 * @returns 清理函数
 */
export function commonShowFinger(
  prefab: Prefab,
  targetNode: Node,
  offset: { x: number; y: number } = { x: 0, y: 0 },
  parentNode: Node = find("Canvas")
) {
  const parent = parentNode;
  const fingerNode = instantiate(prefab);

  const targetWorldPos = targetNode.getWorldPosition();
  const localPos = parent
    .getComponent(UITransform)
    .convertToNodeSpaceAR(targetWorldPos);

  // 计算目标节点的边界
  const size = getContentSizeWithScale(fingerNode);
  const fingerWidth = size.width;
  const fingerHeight = size.height;

  // 计算最终位置（包含偏移）
  const centerX = localPos.x;
  const centerY = localPos.y;

  // 右下角起始位置
  const rightBottomX = centerX + fingerWidth / 1.5 + offset.x;
  const rightBottomY = centerY - fingerHeight / 1.5 + offset.y;

  // 小幅度左上移动的目标位置
  const moveDistance = 30; // 移动距离，可以根据需要调整
  const leftTopX = rightBottomX - moveDistance;
  const leftTopY = rightBottomY + moveDistance;

  // 设置手指初始位置（右下角）
  fingerNode.setPosition(rightBottomX, rightBottomY, 0);
  parent.addChild(fingerNode);

  // 创建手指小幅度往左上角移动的动画
  tween(fingerNode)
    .to(
      0.4,
      { position: new Vec3(leftTopX, leftTopY, 0) },
      {
        easing: "sineInOut",
      }
    )
    .to(
      0.4,
      { position: new Vec3(rightBottomX, rightBottomY, 0) },
      {
        easing: "sineInOut",
      }
    )
    .union()
    .repeatForever()
    .start();

  return () => {
    if (fingerNode && fingerNode.isValid) {
      fingerNode.destroy();
    }
  };
}

export function setContentSize(node: Node, size: Size) {
  node
    .getComponent(UITransform)
    .setContentSize(new Size(size.width, size.height));
}

export function getUIOpacity(node: Node): UIOpacity {
  let opacity = node.getComponent(UIOpacity);
  if (!opacity) {
    opacity = node.addComponent(UIOpacity);
  }
  return opacity;
}

export function hideNodes(nodes: Node[]) {
  nodes.forEach((node) => {
    if (node) {
      node.active = false;
    }
  });
}

export function showNodes(nodes: Node[]) {
  nodes.forEach((node) => {
    if (node) {
      node.active = true;
    }
  });
}

/**
 * 获取spine动画名称
 * @param skeleton
 * @returns
 */
export function getSpineAnimationNames(skeleton: sp.Skeleton): string[] {
  const enumMap = skeleton.skeletonData.getAnimsEnum?.();
  return enumMap
    ? Object.keys(enumMap).filter((v) => v.indexOf("None") === -1)
    : [];
}

function createAnimationController({
  animationNode,
  loopNum = 1,
  onInterval,
  onComplete,
  destoryType = "destroy",
}: {
  animationNode: Node;
  loopNum?: number;
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
}) {
  const animation = animationNode.getComponent(Animation);
  if (!animation) {
    console.error("没有找到animation组件");
    return;
  }

  // 设置动画循环模式，避免受到cocos动画编辑器的影响
  if (loopNum !== -1) {
    const state = animation.getState(animation.defaultClip.name);
    if (state) {
      state.wrapMode = AnimationClip.WrapMode.Normal;
      state.repeatCount = 1;
    } else {
      console.warn("[createAnimationController]没有找到动画状态");
    }
  }

  let playCount = 0;
  const onFinished = () => {
    playCount++;
    if (playCount >= loopNum && loopNum !== -1) {
      if (destoryType === "destroy") {
        animationNode.destroy();
      } else if (destoryType === "hide") {
        animationNode.active = false;
      }
      onComplete?.();
    } else {
      animation.play();
      onInterval?.(playCount);
    }
  };
  animation.on(Animation.EventType.FINISHED, onFinished);
  animation.play();

  return {
    aniObject: animation,
    destoryAniFn: () => {
      animationNode.destroy();
    },
  };
}

/**
 * 在指定节点上播放序列帧动画
 */
export function playAnimationInNode({
  targetNode,
  loopNum = 1,
  onInterval,
  onComplete,
  destoryType = "destroy",
}: {
  targetNode: Node;
  loopNum?: number;
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
}) {
  targetNode.active = true;
  return createAnimationController({
    animationNode: targetNode,
    loopNum,
    onInterval,
    onComplete,
    destoryType,
  });
}

/**
 * 添加序列帧动画到指定节点下
 */
export function addAnimationToNode({
  prefab,
  targetNode,
  offset = { x: 0, y: 0 },
  loopNum = 1,
  scaleDirection = 1,
  destoryType = "destroy",
  onInterval,
  onComplete,
}: {
  prefab: Prefab;
  targetNode: Node;
  offset?: { x: number; y: number };
  loopNum?: number;
  scaleDirection?: number;
  destoryType?: "destroy" | "hide" | "none";
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
}) {
  // 去除targetNode的layout组件
  const layout = targetNode.getComponent(Layout);
  if (layout) {
    layout.enabled = false;
  }

  const node = instantiate(prefab);
  targetNode.addChild(node);

  // 设置位置和缩放（含朝向）
  node.setPosition(offset.x, offset.y, 0);
  node.setScale(node.scale.x * scaleDirection, node.scale.y, node.scale.z);

  return createAnimationController({
    animationNode: node,
    loopNum,
    onInterval,
    onComplete,
    destoryType,
  });
}

function createSpineController({
  spineNode,
  aniName,
  loopNum = 1,
  onEvent,
  onInterval,
  onComplete,
  destoryType = "destroy",
}: {
  spineNode: Node;
  aniName?: string;
  loopNum?: number;
  onEvent?: (eventName: string) => void;
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
}) {
  const spine = spineNode.getComponent(sp.Skeleton);
  if (!spine) {
    console.error("没有找到spine组件");
    return;
  }

  // 获取动画名称
  const defaultAnimation = getSpineAnimationNames(spine)[0];
  const playAniName = aniName ?? defaultAnimation;

  // 设置事件监听器
  if (onEvent) {
    spine.setEventListener((_entry: any, event: any) => {
      spine.setEventListener(null);
      onEvent(event.data.name);
    });
  }

  let playCount = 0;
  const onFinished = () => {
    playCount++;
    if (playCount >= loopNum && loopNum !== -1) {
      spine.setCompleteListener(null);
      if (destoryType === "destroy") {
        spineNode.destroy();
      } else if (destoryType === "hide") {
        spineNode.active = false;
      }
      onComplete?.();
    } else {
      spine.setAnimation(0, playAniName, false);
      onInterval?.(playCount);
    }
  };

  spine.setCompleteListener(onFinished);
  spine.setAnimation(0, playAniName, false);

  return {
    aniObject: spine,
    destoryAniFn: () => {
      spineNode.destroy();
    },
  };
}

/**
 * 在指定节点上播放Spine动画
 */
export function playSpineInNode({
  node,
  aniName,
  onEvent,
  onInterval,
  onComplete,
  destoryType = "destroy",
  loopNum = 1,
}: {
  node: Node;
  aniName: string;
  onEvent?: (eventName: string) => void;
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
  loopNum?: number;
}) {
  node.active = true;
  return createSpineController({
    spineNode: node,
    aniName,
    loopNum,
    onEvent,
    onInterval,
    onComplete,
    destoryType,
  });
}

/**
 * 添加Spine动画到指定节点下
 */
export function addSpineToNode({
  prefab,
  targetNode,
  aniName,
  offset = { x: 0, y: 0 },
  loopNum = -1,
  scaleDirection = 1,
  destoryType = "destroy",
  onEvent,
  onInterval,
  onComplete,
}: {
  prefab: Prefab;
  targetNode: Node;
  aniName?: string;
  offset?: { x: number; y: number };
  loopNum?: number;
  scaleDirection?: number;
  onEvent?: (eventName: string) => void;
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
}) {
  // 去除targetNode的layout组件
  const layout = targetNode.getComponent(Layout);
  if (layout) {
    layout.enabled = false;
  }

  const node = instantiate(prefab);
  targetNode.addChild(node);

  // 设置位置和朝向
  node.setPosition(offset.x, offset.y, 0);
  node.setScale(node.scale.x * scaleDirection, node.scale.y, 1);

  return createSpineController({
    spineNode: node,
    aniName,
    loopNum,
    onEvent,
    onInterval,
    onComplete,
    destoryType,
  });
}

/**
 * 获取刘海高度,不是特别准确,仅供参考
 * @returns
 */
export function getLiuhaiHeight() {
  const visibleSize = view.getVisibleSize();
  console.log("visibleSize", visibleSize);

  const safeArea = sys.getSafeAreaRect();
  console.log("safeArea", safeArea);

  const liuhaiHeight = visibleSize.height - safeArea.height - safeArea.y;
  console.log("刘海高度", liuhaiHeight);

  const h = liuhaiHeight / (720 / 375);
  console.log("缩放比换算后的刘海高度", h);

  let ph = h > 30 ? h + 20 : 0;
  console.log("修正后的刘海高度1", ph);

  ph = ph > 80 ? 80 : ph;
  console.log("修正后的刘海高度2", ph);

  return ph;
}

/**
 * 更新节点widget组件的top位置,一般用于适配刘海屏
 * @param node
 */
export function updateWidgetWithLiuhai(node: Node, offsetY: number = 0) {
  if (!node) return;
  const widget = node.getComponent(Widget);
  if (widget) {
    const statusBarHeight = getLiuhaiHeight();
    widget.top = widget.top + statusBarHeight + offsetY;
    widget.updateAlignment();
  } else {
    console.error("[updateWidgetWithLiuhai]没有找到widget组件");
  }
}

/**
 * 缩放节点并保持底部对齐（适用于中心缩放的节点）
 * @param node 要缩放的节点
 * @param scale 缩放倍数（可传单个数值或 Vec3）
 */
export function scaleWithBottomAlign(node: Node, scale: number | Vec3) {
  const uiTransform = node.getComponent(UITransform);

  const originalHeight = uiTransform.height;
  const anchorY = node.getComponent(UITransform)?.anchorY ?? 0.5;

  const oldScale = node.scale;
  const newScale =
    typeof scale === "number" ? new Vec3(scale, scale, scale) : scale;

  const deltaScaleY = newScale.y - oldScale.y;
  // 计算缩放前后的偏移量
  const offsetY = originalHeight * deltaScaleY * anchorY;

  // 更新 scale 和位置
  node.setScale(newScale);
  node.setPosition(node.position.x, node.position.y + offsetY, node.position.z);
}

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

export function fadeOut(node: Node, duration = 0.4, isDestroy = true) {
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
  easing: TweenEasing = "quadOut"
) {
  return new Promise((resolve, reject) => {
    node.active = true;
    const originScale = node.scale.clone();
    node.setScale(0, 0, 1);
    tween(node)
      .to(duration, { scale: originScale }, { easing })
      .call(() => {
        resolve("");
      })
      .start();
  });
}

export function scaleInBounce(
  node: Node,
  duration: number = 0.4,
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
      .to(duration * 0.6, { scale: overshootScale }, { easing: "quadOut" })
      .to(duration * 0.4, { scale: originScale }, { easing: "backOut" })
      .call(() => {
        resolve("");
      })
      .start();
  });
}

export const movePointAToPointB = (
  node: Node,
  startPos: Vec3,
  endPos: Vec3,
  duration = 0.3,
  easing: TweenEasing = "sineInOut"
) => {
  return new Promise((resolve) => {
    node.active = true;
    node.setPosition(startPos);

    tween(node)
      .to(duration, { position: endPos }, { easing })
      .call(() => {
        resolve("");
      })
      .start();
  });
};

export const moveNodeAToNodeB = (
  startNode: Node,
  endNode: Node,
  duration = 0.5,
  easing: TweenEasing = "sineInOut"
) => {
  return new Promise((resolve) => {
    startNode.active = true;
    const endPos = startNode.parent
      .getComponent(UITransform)
      .convertToNodeSpaceAR(endNode.worldPosition);
    tween(startNode)
      .to(duration, { position: endPos }, { easing })
      .call(() => {
        resolve("");
      })
      .start();
  });
};

export function getPrevNode(node: Node) {
  const currentIndex = node.parent.children.indexOf(node);
  if (currentIndex > 0) {
    const previousNode = node.parent.children[currentIndex - 1];
    return previousNode;
  }
  return null;
}

export function disableLayout(node: Node) {
  const layout = node.getComponent(Layout);
  if (layout) {
    layout.enabled = false;
  }
}

export function findParentWithComponent(node: Node, comp: string) {
  const parent = node.parent;
  if (parent) {
    const parentComponent = parent.getComponent(comp);
    if (parentComponent) {
      return parent;
    }
    return findParentWithComponent(parent, comp);
  }
  return null;
}

/**
 * 递归搜索下级节点，找到所有符合条件的节点
 * @param parentNode 父节点，从此节点开始搜索
 * @param condition 条件回调函数，返回true表示找到目标节点
 * @returns 找到的所有符合条件的节点数组
 */
export function findChildNodes(
  parentNode: Node,
  condition: (node: Node) => boolean
): Node[] {
  const results: Node[] = [];

  // 先检查当前节点是否符合条件
  if (condition(parentNode)) {
    results.push(parentNode);
  }

  // 递归搜索所有子节点
  for (const child of parentNode.children) {
    const childResults = findChildNodes(child, condition);
    results.push(...childResults);
  }

  return results;
}

/**
 * 洗牌算法 - 支持混合类型数组
 */
export function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function progressiveMove({
  nodeList,
  intervalDelay = 0.2,
  animationDuration = 0.3,
  offsetX = 0,
  offsetY = 0,
  easing = "quadOut",
  isPlayAudio = true,
}: {
  nodeList: Node[];
  intervalDelay: number;
  animationDuration: number;
  offsetX: number;
  offsetY: number;
  easing?: TweenEasing;
  isPlayAudio?: boolean;
}) {
  return new Promise((resolve) => {
    if (nodeList.length === 0) {
      resolve("");
      return;
    }
    hideNodes(nodeList);
    let completedCount = 0;
    const totalNodeLength = nodeList.length;

    nodeList.forEach((node, index) => {
      const delay = index * intervalDelay;
      setTimeout(() => {
        const startPos = new Vec3(
          node.position.x + offsetX,
          node.position.y + offsetY,
          node.position.z
        );
        if (isPlayAudio) {
          // playOneShot(AUDIO_ENUM.弹出);
        }
        movePointAToPointB(
          node,
          startPos,
          node.position.clone(),
          animationDuration,
          easing
        ).then(() => {
          completedCount++;
          if (completedCount === totalNodeLength) {
            resolve("");
          }
        });
      }, delay * 1000);
    });
  });
}

/**
 * 递进缩放
 * @param nodeList
 * @param intervalDelay
 * @param animationDuration
 * @returns
 */
export function progressiveZoom(
  nodeList: Node[],
  intervalDelay: number = 0.2,
  animationDuration: number = 0.3
) {
  return new Promise((resolve) => {
    if (nodeList.length === 0) {
      resolve("");
      return;
    }
    hideNodes(nodeList);
    let completedCount = 0;
    const totalNodeLength = nodeList.length;

    nodeList.forEach((node, index) => {
      const delay = index * intervalDelay;
      setTimeout(() => {
        scaleIn(node, animationDuration).then(() => {
          completedCount++;
          if (completedCount === totalNodeLength) {
            resolve("");
          }
        });
      }, delay * 1000);
    });
  });
}

/**
 * 设置锚点
 * @param anchorX X轴锚点 (0-1)
 * @param anchorY Y轴锚点 (0-1)
 */
export function setAnchorPoint(
  node: Node,
  anchorX: number,
  anchorY: number
): void {
  if (node) {
    const uiTransform = node.getComponent(UITransform);
    if (uiTransform) {
      uiTransform.anchorPoint = new Vec2(anchorX, anchorY);
    }
  }
}

export function addNodeToParent(node: Node, parent?: Node) {
  if (!parent) {
    parent = find("Canvas");
  }
  const localPos = parent
    .getComponent(UITransform)
    .convertToNodeSpaceAR(node.worldPosition);
  node.setPosition(localPos);
  parent.addChild(node);
}

export function disableCollider(node: Node) {
  const collider = node.getComponent(Collider2D);
  if (collider) {
    collider.enabled = false;
  }
}

export function enableCollider(node: Node) {
  const collider = node.getComponent(Collider2D);
  if (collider) {
    collider.enabled = true;
  }
}

export function setAnimationSpeed(node: Node, speed: number) {
  const animation = node.getComponent(Animation);
  const state = animation.getState(animation.defaultClip.name);
  if (state) {
    state.speed = speed;
  }
}

/**
   * 给节点绑定Button组件并设置点击事件
   * @param options 配置选项
   * @param options.node 要绑定Button的节点
   * @param options.targetNode 事件处理代码组件所属的节点
   * @param options.component 脚本组件
   * @param options.handler 处理函数
   * @param options.customEventData 自定义事件数据
   * 调用方式：
   * bindButtonWithHandler({
        node: this.skillTreeItemList[0].itemNode,
        targetNode: this.node,
        component: this,
        handler: this.handleStart
      });
   */
export function bindButtonWithHandler({
  node,
  targetNode,
  component,
  handler,
  customEventData,
  scaleOptions,
}: {
  node: Node;
  targetNode: Node;
  component: Component;
  handler: Function;
  customEventData?: string;
  scaleOptions?: {
    scale: number;
    duration: number;
  };
}) {
  if (!node) {
    console.warn("[bindButtonWithHandler] 节点不存在");
    return;
  }

  let button = node.getComponent(Button);
  if (!button) {
    button = node.addComponent(Button);
  }

  const clickEventHandler = new EventHandler();
  clickEventHandler.target = targetNode;
  clickEventHandler.component = component.constructor.name;
  clickEventHandler.handler = handler.name;
  if (customEventData) {
    clickEventHandler.customEventData = customEventData;
  }
  button.transition = Button.Transition.SCALE;
  button.zoomScale = scaleOptions?.scale ?? 1.2;
  button.duration = scaleOptions?.duration ?? 0.1;

  button.clickEvents.push(clickEventHandler);
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
  easing: TweenEasing = "sineInOut"
): Promise<void> {
  return new Promise((resolve) => {
    if (!node || !node.isValid) {
      console.warn("[shakeRotation] 节点无效");
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
          angle: originalRotation + shakeAngle,
        },
        { easing }
      );

      // 向左旋转摇晃
      shakeSequence = shakeSequence.to(
        shakeDuration,
        {
          angle: originalRotation - shakeAngle,
        },
        { easing }
      );
    }

    // 最后回到原始角度
    shakeSequence = shakeSequence
      .to(
        shakeDuration,
        {
          angle: originalRotation,
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
    (child) => child !== selectedCard
  );

  // 避免重复点击
  cardA.getComponent(Button).interactable = false;
  cardB.getComponent(Button).interactable = false;

  if (cardA && cardB) {
    const originalScaleA = cardA.getScale().clone();
    const parsedMinScale = originalScaleA.x * minScale;
    const parsedMaxScale = originalScaleA.x * maxScale;

    await new Promise((resolve) => {
      tween(cardA)
        .to(duration, { scale: new Vec3(parsedMinScale, parsedMinScale, 1) })
        .call(() => {
          tween(cardA)
            .to(duration, {
              scale: new Vec3(parsedMaxScale, parsedMaxScale, 1),
            })
            .start();

          cardB.getComponent(Sprite).grayscale = true;
          tween(cardB)
            .to(duration, {
              scale: new Vec3(parsedMinScale, parsedMinScale, 1),
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
 * 延迟n帧执行回调
 * @param comp 依附的Component
 * @param n 延迟帧数
 * @param cb 回调函数
 */
export function delayFrames(comp: Component, n: number, cb?: () => void) {
  let count = 0;
  function frameCallback() {
    count++;
    if (count >= n) {
      comp.unschedule(frameCallback);
      cb && cb();
    }
  }
  comp.schedule(frameCallback, 0);
}

/**
 * 解析事件参数字符串
 * @param eventData 事件参数字符串，格式如 "type=random&value=0"
 * @returns 解析后的参数对象
 * @example
 * parseEventParams("type=random&value=0") // { type: "random", value: "0" }
 * parseEventParams("id=123&name=test&enabled=true") // { id: "123", name: "test", enabled: "true" }
 */
export function parseEventParams(eventData: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!eventData || typeof eventData !== 'string') {
    return params;
  }

  // 按 & 分割参数
  const pairs = eventData.split('&');

  for (const pair of pairs) {
    // 按 = 分割键值对
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      params[key.trim()] = value.trim();
    }
  }

  return params;
}

/**
 * 从 URL 中获取查询参数
 * @param url 可选，URL 字符串。不传则使用当前页面 URL
 * @returns 查询参数对象
 * @example
 * // 当前 URL: http://example.com?id=123&name=test&debug=1
 * getUrlParams() // { id: "123", name: "test", debug: "1" }
 */
export function getUrlParams(url?: string): Record<string, string> {
  const params: Record<string, string> = {};

  try {
    // 如果没有传入 URL，使用当前页面 URL
    const targetUrl =
      url || (typeof window !== 'undefined' ? window.location.href : '');

    if (!targetUrl) {
      return params;
    }

    const urlObj = new URL(targetUrl);

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (error) {
    console.warn('[getUrlParams] 解析 URL 失败:', error);
  }

  return params;
}

/**
 * 从 URL 中获取单个查询参数
 * @param key 参数名
 * @param url 可选，URL 字符串。不传则使用当前页面 URL
 * @returns 参数值，如果不存在则返回 null
 * @example
 * // 当前 URL: http://example.com?id=123&name=test
 * getUrlParam('id') // "123"
 */
export function getUrlParamByKey(key: string, url?: string): string | null {
  const params = getUrlParams(url);
  return params[key] || null;
}

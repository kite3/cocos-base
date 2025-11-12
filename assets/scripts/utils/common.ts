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
  Label,
  PhysicsSystem2D,
} from "cc";
import { playOneShot } from "../baseManager/AudioManager";
import { AUDIO_ENUM } from "../global";

declare const wx: any;

export function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

export function disableBtn(
  btnComponent: Button,
  spriteNode: Node = btnComponent.node
) {
  if (!btnComponent) {
    console.error("[disableBtn] btnComponent is null");
    return;
  }
  if (!spriteNode) {
    console.error("[disableBtn] spriteNode is null");
    return;
  }
  btnComponent.interactable = false;
  spriteNode.getComponent(Sprite).grayscale = true;
}

export function enableBtn(
  btnComponent: Button,
  spriteNode: Node = btnComponent.node
) {
  if (!btnComponent) {
    console.error("[enableBtn] btnComponent is null");
    return;
  }
  if (!spriteNode) {
    console.error("[enableBtn] spriteNode is null");
    return;
  }
  btnComponent.interactable = true;
  spriteNode.getComponent(Sprite).grayscale = false;
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
      animation.off(Animation.EventType.FINISHED, onFinished);
    } else {
      animation.play();
      onInterval?.(playCount);
    }
  };
  animation.on(Animation.EventType.FINISHED, onFinished);
  animation.play();

  return {
    aniObject: animation,
    aniNode: animationNode,
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
  destoryType = "destroy",
}: {
  targetNode: Node;
  loopNum?: number;
  onInterval?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
}) {
  return new Promise<void>((resolve, reject) => {
    targetNode.active = true;
    return createAnimationController({
      animationNode: targetNode,
      loopNum,
      onInterval,
      onComplete: resolve,
      destoryType,
    });
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
  scaleDirection,
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
  timeScale,
  intervalTime = 0,
  onEvent,
  onIntervalStart,
  onInterval,
  onComplete,
  destoryType = "destroy",
}: {
  spineNode: Node;
  aniName?: string;
  loopNum?: number;
  timeScale?: number;
  intervalTime?: number;
  onEvent?: (eventName: string) => void;
  onIntervalStart?: (eventName: number) => void;
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
  const onFinished = async () => {
    spine.setCompleteListener(null);
    playCount++;
    if (playCount >= loopNum && loopNum !== -1) {
      if (destoryType === "destroy") {
        spineNode.destroy();
      } else if (destoryType === "hide") {
        spineNode.active = false;
      }
      onInterval?.(playCount);
      onComplete?.();
    } else {
      spineNode.active = false;
      onInterval?.(playCount);
      await sleep(intervalTime);
      onIntervalStart?.(playCount);
      spineNode.active = true;
      spine.setCompleteListener(onFinished);
      spine.setAnimation(0, playAniName, false);
    }
  };

  onIntervalStart?.(playCount);
  spine.setCompleteListener(onFinished);
  if (timeScale !== undefined && timeScale !== null) {
    spine.timeScale = timeScale;
  }
  spine.setAnimation(0, playAniName, false);

  return {
    aniObject: spine,
    aniNode: spineNode,
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
  timeScale,
  intervalTime = 0,
  onEvent,
  onInterval,
  onIntervalStart,
  onComplete,
  destoryType = "destroy",
  loopNum = 1,
}: {
  node: Node;
  aniName: string;
  timeScale?: number;
  intervalTime?: number; //间隔时间
  onEvent?: (eventName: string) => void;
  onInterval?: (playCount: number) => void;
  onIntervalStart?: (playCount: number) => void;
  onComplete?: () => void;
  destoryType?: "destroy" | "hide" | "none";
  loopNum?: number;
}) {
  node.active = true;
  return createSpineController({
    spineNode: node,
    aniName,
    timeScale,
    loopNum,
    intervalTime,
    onEvent,
    onIntervalStart,
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
  loopNum = 1,
  scaleDirection = 1,
  destoryType = "destroy",
  timeScale,
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
  timeScale?: number;
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
    timeScale,
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
export function shuffleArray<T>(array: T[]) {
  const shuffledArray = array.slice();
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
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
 * 延迟指定帧数后执行回调
 * @param comp 组件实例
 * @param n 延迟帧数
 * @param cb 回调函数
 */
export function delayFrames(comp: Component, n: number, cb?: () => void) {
  let count = 0;
  const update = () => {
    count++;
    if (count >= n) {
      comp.unschedule(update);
      cb?.();
    }
  };
  comp.schedule(update, 0);
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

  if (!eventData || typeof eventData !== "string") {
    return params;
  }

  // 按 & 分割参数
  const pairs = eventData.split("&");

  for (const pair of pairs) {
    // 按 = 分割键值对
    const [key, value] = pair.split("=");
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
      url || (typeof window !== "undefined" ? window.location.href : "");

    if (!targetUrl) {
      return params;
    }

    const urlObj = new URL(targetUrl);

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (error) {
    console.warn("[getUrlParams] 解析 URL 失败:", error);
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

/**
 * 判断节点是否可见
 */
export function isNodeVisible(node: Node): boolean {
  let current = node;
  while (current) {
    if (!current.active) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

/**
 * 计算节点列表的中心点
 * @param nodes 节点列表
 * @param getWorldPos 可选函数，用于获取节点的世界坐标（默认使用节点本身的getWorldPosition）
 * @returns 中心点的世界坐标
 */
export function getNodesCenter(
  nodes: Node[],
  getWorldPos?: (node: Node) => Vec3
): Vec3 {
  if (nodes.length === 0) {
    return new Vec3();
  }

  let centerX = 0;
  let centerY = 0;

  nodes.forEach((node) => {
    const worldPos = getWorldPos ? getWorldPos(node) : node.getWorldPosition();
    centerX += worldPos.x;
    centerY += worldPos.y;
  });

  centerX /= nodes.length;
  centerY /= nodes.length;

  return new Vec3(centerX, centerY, 0);
}

// 切换Spine动作，避免相同动作重复切换
export async function updateSpineAction(
  spine: sp.Skeleton,
  animName: string,
  isLoop: boolean = true
) {
  if (!spine) {
    console.error(`[切换动作] spine不存在`);
    return;
  }
  if (!(spine instanceof sp.Skeleton)) {
    console.error(`[切换动作] spine不是sp.Skeleton类型`);
    return;
  }
  if (spine.animation !== animName) {
    console.warn(
      `[${spine.node.name}切换动作] ${spine.animation} -> ${animName}`
    );
    spine.setAnimation(0, animName, isLoop);
  }
}

/**
 * 计算摇杆移动方向的角度（以度为单位）
 * @param moveDir 摇杆移动方向向量（归一化）
 * @returns 返回角度值（0-360度），0度为右方向，90度为上方向，180度为左方向，270度为下方向
 * @example
 * // 使用示例
 * import { getJoystickMoveAngle } from '../utils/common';
 *
 * const angle = getJoystickMoveAngle(moveDir);
 * // 判断是否在垂直向上±15度范围内
 * const isVerticalUp = moveDir.y > 0 && angle >= 75 && angle <= 105;
 */
export function getJoystickMoveAngle(moveDir: Vec2): number {
  return Math.atan2(moveDir.y, moveDir.x) * (180 / Math.PI);
}

/**
 * 检查移动方向的碰撞状态
 * @param playerNode 主角节点
 * @param moveDir 移动方向向量（归一化）
 * @param ObstacleComponent 障碍物组件类（如 Aside），用于过滤碰撞结果
 * @returns 返回碰撞状态对象 { isLeft: boolean, isRight: boolean, isTop: boolean, isBottom: boolean }
 *
 * @example
 * // 使用示例
 * import { Aside } from '../entity/Aside';
 * import { checkCollisionDirection } from '../utils/common';
 *
 * const collisionState = checkCollisionDirection(this.node, moveDir, Aside);
 * // 检查右侧碰撞，阻止向右移动
 * if (collisionState.isRight && moveDir.x > 0) {
 *   newX = curPos.x;
 * }
 * // 检查左侧碰撞，阻止向左移动
 * if (collisionState.isLeft && moveDir.x < 0) {
 *   newX = curPos.x;
 * }
 * // 检查上方碰撞，阻止向上移动
 * if (collisionState.isTop && moveDir.y > 0) {
 *   newY = curPos.y;
 * }
 * // 检查下方碰撞，阻止向下移动
 * if (collisionState.isBottom && moveDir.y < 0) {
 *   newY = curPos.y;
 * }
 */
export function checkCollisionDirection({
  playerNode,
  moveDir,
  ObstacleComponent,
  offset = 10,
}: {
  playerNode: Node;
  moveDir: Vec2;
  ObstacleComponent: typeof Component;
  offset?: number;
}) {
  let collisionState = {
    isLeft: false,
    isRight: false,
    isTop: false,
    isBottom: false,
  };

  const playerPos = playerNode.getWorldPosition();

  if (Math.abs(moveDir.x) > 0 || Math.abs(moveDir.y) > 0) {
    const rayDir = new Vec2(
      playerPos.x +
        (Math.abs(moveDir.x) > 0
          ? moveDir.x + (moveDir.x > 0 ? offset : -offset)
          : 0),
      playerPos.y +
        (Math.abs(moveDir.y) > 0
          ? moveDir.y + (moveDir.y > 0 ? offset : -offset)
          : 0)
    );
    const result = PhysicsSystem2D.instance
      .testPoint(rayDir)
      .filter((item) => item.node.getComponent(ObstacleComponent));
    if (result.length > 0) {
      console.log("-->触发边界限制", result.length);
    }

    if (result.length > 0) {
      result.forEach((item) => {
        if (Math.abs(moveDir.x) > 0) {
          collisionState.isRight = collisionState.isRight || moveDir.x > 0;
          collisionState.isLeft = collisionState.isLeft || moveDir.x < 0;
        }
        if (Math.abs(moveDir.y) > 0) {
          collisionState.isTop = collisionState.isTop || moveDir.y > 0;
          collisionState.isBottom = collisionState.isBottom || moveDir.y < 0;
        }
      });
    } else {
      console.log("-->没有触发边界限制2");
    }
  } else {
    console.log("-->没有触发边界限制1");
  }

  return collisionState;
}

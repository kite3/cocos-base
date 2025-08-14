import {
  _decorator,
  Component,
  Node,
  TiledMap,
  Vec3,
  EventTouch,
  UITransform,
  Camera,
  find
} from 'cc';
import { globalEvent, GlobalEvent } from '../global';
const { ccclass, property } = _decorator;

@ccclass('TileMapWalk')
export class TileMapWalk extends Component {
  @property(Node)
  tileMapNode: Node = null;
  @property(Number)
  private moveSpeed: number = 180; // 像素/秒，可根据需要调整
  @property(String)
  private groundLayerName: string = 'ground';
  @property(String)
  private walkLayerName: string = 'walk';

  private tiledMap: TiledMap = null;
  private grid: any = null; // pathfinding.js 的 Grid 对象
  private walkGrid: any = null;
  private mapCols: number = 11; // 720/64
  private mapRows: number = 20; // 1280/64

  private tileSize: number = 50; // 每个格子的像素大小

  private pathPoints: { x: number; y: number }[] = [];
  private currentPathIndex: number = 0;

  isOver: boolean = false;

  @property(Camera)
  camera: Camera;

  onLoad() {
    this.tileMapNode.active = true;
    this.tiledMap = this.tileMapNode.getComponent(TiledMap);
    this.initGrid();

    this.bindGlobalEvent();
    this.bindUIEvent();
  }

  bindGlobalEvent() {
    globalEvent.on(GlobalEvent.GAME_FAIL, () => {
      this.isOver = true;
    });
    globalEvent.on(GlobalEvent.GAME_WIN, () => {
      this.isOver = true;
    });
    globalEvent.on(GlobalEvent.GAME_RESET, () => {
      this.isOver = false;
    });
    globalEvent.on(GlobalEvent.GAME_START, () => {
      this.isOver = false;
    });
    globalEvent.on(
      GlobalEvent.TILEMAP_STOP,
      () => {
        this.pathPoints = [];
      },
      this
    );
  }

  bindUIEvent() {
    this.tileMapNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
  }

  // 初始化寻路网格
  initGrid() {
    const getWalkable = layerName => {
      const layer = this.tiledMap.getLayer(layerName);
      const mapSize = layer.getLayerSize();
      const walkable: number[][] = [];
      for (let y = 0; y < mapSize.height; y++) {
        walkable[y] = [];
        for (let x = 0; x < mapSize.width; x++) {
          walkable[y][x] = layer.getTileGIDAt(x, y) !== 0 ? 0 : 1; // 0可走，1不可走
        }
      }
      return { walkable, mapSize };
    };

    const { walkable: groundGrid, mapSize: groundMapSize } = getWalkable(
      this.groundLayerName
    );
    const { walkable: walkGrid } = getWalkable(this.walkLayerName);

    this.mapCols = groundMapSize.width;
    this.mapRows = groundMapSize.height;
    this.tileSize = this.tiledMap.getTileSize().width;

    this.grid = groundGrid;
    this.walkGrid = walkGrid;
  }

  getLayerGridPos(layerName: string) {
    const gridPos = [];
    const layer = this.tiledMap.getLayer(layerName);
    const mapSize = layer.getLayerSize();
    const walkable: number[][] = [];
    for (let y = 0; y < mapSize.height; y++) {
      walkable[y] = [];
      for (let x = 0; x < mapSize.width; x++) {
        if (layer.getTileGIDAt(x, y) !== 0) {
          gridPos.push(this.tileToWorldPos({ x, y }));
        }
      }
    }
    return gridPos;
  }

  // 世界坐标转地图格子索引
  private worldPosToTile(pos: Vec3): { x: number; y: number } {
    // 地图左下角世界坐标
    const offsetX = (-this.mapCols * this.tileSize) / 2;
    const offsetY = (this.mapRows * this.tileSize) / 2;
    const x = Math.floor((pos.x - offsetX) / this.tileSize);
    const y = Math.floor((offsetY - pos.y) / this.tileSize);
    return { x, y };
  }

  // 地图格子索引转世界坐标（格子中心）
  private tileToWorldPos(tile: { x: number; y: number }): Vec3 {
    const offsetX = (-this.mapCols * this.tileSize) / 2;
    const offsetY = (this.mapRows * this.tileSize) / 2;
    const x = offsetX + tile.x * this.tileSize + this.tileSize / 2;
    const y = offsetY - (tile.y + 1) * this.tileSize + this.tileSize / 2;
    return new Vec3(x, y, 0);
  }

  // 简单A*寻路算法
  private findPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const map = this.grid;
    const width = map[0].length;
    const height = map.length;
    const open: any[] = [];
    const closed: boolean[][] = Array.from({ length: height }, () =>
      Array(width).fill(false)
    );
    const parent: (null | { x: number; y: number })[][] = Array.from(
      { length: height },
      () => Array(width).fill(null)
    );
    const g: number[][] = Array.from({ length: height }, () =>
      Array(width).fill(Infinity)
    );
    const h = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy); // 使用对角线距离
    };

    g[start.y][start.x] = 0;
    open.push({ x: start.x, y: start.y, f: h(start, end) });

    const dirs = [
      { x: 0, y: 1 }, // 上
      { x: 1, y: 0 }, // 右
      { x: 0, y: -1 }, // 下
      { x: -1, y: 0 }, // 左
      { x: 1, y: 1 }, // 右上
      { x: -1, y: 1 }, // 左上
      { x: 1, y: -1 }, // 右下
      { x: -1, y: -1 } // 左下
    ];

    while (open.length > 0) {
      // 取f值最小的点
      open.sort((a, b) => a.f - b.f);
      const curr = open.shift();
      if (curr.x === end.x && curr.y === end.y) {
        // 回溯路径
        const path = [];
        let node: any = end;
        while (node && !(node.x === start.x && node.y === start.y)) {
          path.push(node);
          node = parent[node.y][node.x];
        }
        path.push(start);
        path.reverse();
        return path;
      }
      closed[curr.y][curr.x] = true;
      for (const d of dirs) {
        const nx = curr.x + d.x;
        const ny = curr.y + d.y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (map[ny][nx] === 1) continue; // 障碍物
        if (closed[ny][nx]) continue;

        // 检查对角线移动时是否有障碍物阻挡
        if (d.x !== 0 && d.y !== 0) {
          if (map[curr.y][nx] === 1 || map[ny][curr.x] === 1) continue;
        }

        const isDiagonal = d.x !== 0 && d.y !== 0;
        // 计算基础移动成本
        let ng = g[curr.y][curr.x] + (isDiagonal ? Math.sqrt(2) : 1);

        // 添加walkGrid权重
        // 如果当前格子在walkGrid上是可走的，降低移动成本
        if (this.walkGrid[ny][nx] === 0) {
          ng *= 0.5; // 降低50%的移动成本
        } else {
          ng *= 1.5; // 增加50%的移动成本
        }

        if (ng < g[ny][nx]) {
          g[ny][nx] = ng;
          parent[ny][nx] = { x: curr.x, y: curr.y };
          open.push({ x: nx, y: ny, f: ng + h({ x: nx, y: ny }, end) });
        }
      }
    }
    return []; // 无路可走
  }

  // 触摸事件
  onTouchStart(event: EventTouch) {
    if (this.isOver) {
      return;
    }

    // debugger;
    const eventPos = event.getUILocation();
    const canvasUITransform = this.tileMapNode.getComponent(UITransform);
    const worldPos = canvasUITransform.convertToNodeSpaceAR(
      new Vec3(eventPos.x, eventPos.y, 0)
    );
    // 考虑摄像机偏移
    if (this.camera) {
      const cameraPos = this.camera.node.getPosition();
      worldPos.x += cameraPos.x;
      worldPos.y += cameraPos.y;
    }
    const startTile = this.worldPosToTile(this.node.getPosition());
    const endTile = this.worldPosToTile(worldPos);

    const path = this.findPath(startTile, endTile);

    if (path.length > 0) {
      this.pathPoints = path;
      this.currentPathIndex = 0;
      // 播放点击动画
      globalEvent.emit(GlobalEvent.CLICK_EFFECT);
    } else {
      this.pathPoints = [];

      this.node.emit('tilemap_stop');
    }
  }

  update(deltaTime: number) {
    if (this.pathPoints && this.pathPoints.length > 0) {
      // 当前目标格子
      const targetTile = this.pathPoints[this.currentPathIndex];
      const targetPos = this.tileToWorldPos(targetTile);
      const currentPos = this.node.getPosition();
      const distance = Vec3.distance(currentPos, targetPos);

      // 提前切换目标点，阈值为 tileSize * 0.2
      const switchThreshold = this.tileSize * 0.2;

      if (distance < switchThreshold) {
        this.currentPathIndex++;
        if (this.currentPathIndex >= this.pathPoints.length) {
          // 路径走完
          this.pathPoints = [];
          this.node.emit('tilemap_stop');
          return;
        }
      }

      // 计算移动方向
      const direction = new Vec3(
        targetPos.x - currentPos.x,
        targetPos.y - currentPos.y,
        0
      ).normalize();

      // 使用平滑插值计算新位置
      const moveDist = this.moveSpeed * deltaTime;
      const newPos = new Vec3(
        currentPos.x + direction.x * moveDist,
        currentPos.y + direction.y * moveDist,
        currentPos.z
      );

      //   this.node.setPosition(newPos);

      this.node.emit('tilemap_move', newPos);
    }
  }
}

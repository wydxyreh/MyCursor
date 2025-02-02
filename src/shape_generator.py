import cv2
import numpy as np
import random
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ShapeGenerator:
    def __init__(self, image_path):
        try:
            self.image = cv2.imread(image_path)
            if self.image is None:
                raise Exception(f"无法读取图片: {image_path}")
            
            self.gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
            logger.debug(f"图片尺寸: {self.image.shape}")
            self.grid_regions = self.find_grid_regions()
            logger.debug(f"找到 {len(self.grid_regions)} 个网格区域")
        except Exception as e:
            logger.error(f"初始化失败: {str(e)}")
            raise

    def find_grid_regions(self):
        try:
            # 使用自适应阈值来更好地检测灰色区域
            thresh = cv2.adaptiveThreshold(
                self.gray,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11,
                2
            )
            
            # 查找轮廓
            contours, _ = cv2.findContours(
                thresh,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            # 过滤太小的区域
            min_area = 100  # 最小区域面积
            valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]
            
            logger.debug(f"检测到 {len(valid_contours)} 个有效网格")
            return valid_contours
            
        except Exception as e:
            logger.error(f"查找网格区域失败: {str(e)}")
            raise

    def draw_random_shape(self, x, y, shape_type, size):
        try:
            color = (255, 255, 255)  # 白色
            if shape_type == 'circle':
                cv2.circle(self.image, (x, y), size, color, -1)
            elif shape_type == 'square':
                cv2.rectangle(
                    self.image,
                    (x-size, y-size),
                    (x+size, y+size),
                    color,
                    -1
                )
            elif shape_type == 'triangle':
                points = np.array([
                    [x, y-size],
                    [x-size, y+size],
                    [x+size, y+size]
                ], np.int32)
                cv2.fillPoly(self.image, [points], color)
                
            logger.debug(f"在位置 ({x}, {y}) 绘制 {shape_type}")
        except Exception as e:
            logger.error(f"绘制形状失败: {str(e)}")
            raise

    def generate_shapes(self):
        try:
            shapes = ['circle', 'square', 'triangle']
            
            for i, contour in enumerate(self.grid_regions):
                # 获取网格的边界框
                x, y, w, h = cv2.boundingRect(contour)
                
                # 随机决定这个网格中的形状数量（3-7个）
                num_shapes = random.randint(3, 7)
                logger.debug(f"网格 {i}: 生成 {num_shapes} 个形状")
                
                # 在网格内随机生成形状
                for j in range(num_shapes):
                    # 确保形状在网格内部
                    padding = 15  # 边距
                    shape_x = random.randint(x + padding, x + w - padding)
                    shape_y = random.randint(y + padding, y + h - padding)
                    shape_size = random.randint(5, 10)
                    shape_type = random.choice(shapes)
                    
                    self.draw_random_shape(shape_x, shape_y, shape_type, shape_size)
                    
            logger.debug("形状生成完成")
        except Exception as e:
            logger.error(f"生成形状失败: {str(e)}")
            raise

    def save_result(self, output_path):
        try:
            success = cv2.imwrite(output_path, self.image)
            if not success:
                raise Exception("保存图片失败")
            logger.debug(f"图片已保存到: {output_path}")
        except Exception as e:
            logger.error(f"保存结果失败: {str(e)}")
            raise 
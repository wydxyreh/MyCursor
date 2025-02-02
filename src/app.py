from flask import Flask, render_template, send_file, jsonify
from shape_generator import ShapeGenerator
import os
import uuid
import logging

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置上传和输出文件夹的绝对路径
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'static', 'images')
OUTPUT_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'static', 'output')

# 确保文件夹存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"渲染首页失败: {str(e)}")
        return "服务器错误", 500

@app.route('/generate', methods=['POST'])
def generate():
    try:
        # 检查模板图片是否存在
        template_path = os.path.join(UPLOAD_FOLDER, 'template.jpg')
        if not os.path.exists(template_path):
            logger.error(f"模板图片不存在: {template_path}")
            return jsonify({
                'success': False,
                'error': '模板图片不存在，请确保已上传 template.jpg'
            })

        # 生成唯一文件名
        output_filename = f"{uuid.uuid4()}.jpg"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        logger.debug(f"开始生成图片: {output_path}")
        
        # 使用原始图片生成新图片
        generator = ShapeGenerator(template_path)
        generator.generate_shapes()
        generator.save_result(output_path)
        
        # 检查生成的图片是否存在
        if not os.path.exists(output_path):
            logger.error(f"图片生成失败，文件不存在: {output_path}")
            return jsonify({
                'success': False,
                'error': '图片生成失败'
            })
        
        logger.debug(f"图片生成成功: {output_path}")
        
        return jsonify({
            'success': True,
            'image_url': f'/static/output/{output_filename}',
            'download_url': f'/download/{output_filename}'
        })
    except Exception as e:
        logger.error(f"生成图片时发生错误: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'生成失败: {str(e)}'
        })

@app.route('/download/<filename>')
def download(filename):
    try:
        file_path = os.path.join(OUTPUT_FOLDER, filename)
        if not os.path.exists(file_path):
            logger.error(f"下载文件不存在: {file_path}")
            return "文件不存在", 404
            
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        logger.error(f"下载文件失败: {str(e)}")
        return "下载失败", 500

if __name__ == '__main__':
    # 输出重要的路径信息
    logger.info(f"上传文件夹路径: {UPLOAD_FOLDER}")
    logger.info(f"输出文件夹路径: {OUTPUT_FOLDER}")
    logger.info(f"模板图片路径: {os.path.join(UPLOAD_FOLDER, 'template.jpg')}")
    
    app.run(debug=True) 
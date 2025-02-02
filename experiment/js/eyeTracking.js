class EyeTracker {
    constructor() {
        this.video = document.getElementById('webcam');
        this.eyePositions = [];
        this.isTracking = false;
        this.currentTaskStartTime = 0;
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('Starting eye tracker initialization...');

            // 1. 首先检查浏览器支持
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('您的浏览器不支持摄像头访问，请使用现代浏览器（如 Chrome）');
            }

            // 2. 等待 face-api.js 加载完成
            await this.waitForFaceAPI();

            // 3. 请求摄像头权限
            console.log('Requesting camera permission...');
            const stream = await this.requestCamera();

            // 4. 设置视频流
            await this.setupVideo(stream);

            // 5. 加载人脸检测模型
            await this.loadFaceDetectionModel();
            
            this.initialized = true;
            console.log('Eye tracker initialization completed');
            return true;
        } catch (error) {
            console.error('Eye tracker initialization failed:', error);
            alert(error.message);
            return false;
        }
    }

    async waitForFaceAPI() {
        return new Promise((resolve, reject) => {
            const maxAttempts = 50; // 5秒超时
            let attempts = 0;
            
            const checkFaceAPI = () => {
                attempts++;
                if (window.faceapi) {
                    this.faceapi = window.faceapi;
                    console.log('face-api.js loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('face-api.js 加载超时'));
                } else {
                    setTimeout(checkFaceAPI, 100);
                }
            };
            checkFaceAPI();
        });
    }

    async requestCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            };

            console.log('Requesting camera with constraints:', constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera access granted');
            return stream;
        } catch (error) {
            console.error('Camera access error:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('摄像头访问被拒绝，请允许使用摄像头并刷新页面');
            } else if (error.name === 'NotFoundError') {
                throw new Error('未找到摄像头设备，请确保摄像头已连接');
            } else if (error.name === 'NotReadableError') {
                throw new Error('摄像头可能被其他应用程序占用，请关闭其他使用摄像头的应用');
            } else {
                throw new Error(`摄像头访问错误: ${error.message}`);
            }
        }
    }

    async setupVideo(stream) {
        return new Promise((resolve, reject) => {
            try {
                this.video.srcObject = stream;
                this.video.style.display = 'none';
                
                this.video.onloadedmetadata = async () => {
                    try {
                        await this.video.play();
                        console.log('Video playback started');
                        resolve();
                    } catch (error) {
                        reject(new Error(`视频播放失败: ${error.message}`));
                    }
                };

                this.video.onerror = () => {
                    reject(new Error('视频加载失败'));
                };

                // 设置超时
                setTimeout(() => {
                    reject(new Error('视频加载超时'));
                }, 10000);
            } catch (error) {
                reject(new Error(`视频设置失败: ${error.message}`));
            }
        });
    }

    async loadFaceDetectionModel() {
        try {
            console.log('Loading face detection models...');
            
            if (!this.faceapi) {
                throw new Error('face-api.js 未正确加载');
            }

            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
            
            await Promise.all([
                this.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                this.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
            ]);
            
            console.log('Face detection models loaded successfully');
        } catch (error) {
            console.error('Model loading error:', error);
            throw new Error(`人脸检测模型加载失败: ${error.message}`);
        }
    }

    startTracking() {
        if (!this.initialized) {
            console.error('Eye tracker not initialized');
            return;
        }
        
        this.isTracking = true;
        this.currentTaskStartTime = Date.now();
        this.eyePositions = [];
        this.track();
    }

    stopTracking() {
        this.isTracking = false;
    }

    async track() {
        if (!this.isTracking || !this.initialized) return;

        try {
            const detections = await this.faceapi.detectSingleFace(
                this.video,
                new this.faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks(true);

            if (detections) {
                // 获取眼睛位置
                const leftEye = detections.landmarks.getLeftEye();
                const rightEye = detections.landmarks.getRightEye();
                
                // 计算眼睛中心点
                const eyePosition = {
                    x: (leftEye[0].x + rightEye[3].x) / 2,
                    y: (leftEye[0].y + rightEye[3].y) / 2
                };
                
                this.eyePositions.push({
                    x: eyePosition.x,
                    y: eyePosition.y,
                    timestamp: Date.now() - this.currentTaskStartTime
                });
                
                console.log('Eye position recorded:', eyePosition);
            }
        } catch (error) {
            console.error('Eye tracking error:', error);
        }

        if (this.isTracking) {
            requestAnimationFrame(() => this.track());
        }
    }

    generateHeatmap(width, height) {
        try {
            if (this.eyePositions.length === 0) {
                console.warn('No eye tracking data available');
                return null;
            }

            const canvas = document.getElementById('heatmapCanvas');
            canvas.width = width;
            canvas.height = height;

            // 创建热力图配置
            const heatmapInstance = h337.create({
                container: document.querySelector('.heatmap-container'),
                radius: 30,
                maxOpacity: 0.6,
                minOpacity: 0,
                blur: 0.75
            });

            // 转换眼动数据为热力图数据点
            const points = this.eyePositions.map(pos => ({
                x: Math.floor(pos.x * width / 640),
                y: Math.floor(pos.y * height / 480),
                value: 1
            }));

            // 生成热力图
            heatmapInstance.setData({
                max: 10,
                data: points
            });

            return canvas.toDataURL();
        } catch (error) {
            console.error('Error generating heatmap:', error);
            return null;
        }
    }
} 
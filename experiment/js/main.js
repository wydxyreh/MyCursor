class ExperimentManager {
    constructor() {
        this.currentTask = 0;
        this.results = [];
        this.eyeTracker = new EyeTracker();
        this.setupEventListeners();
        this.initializeEyeTracking();
    }

    async initializeEyeTracking() {
        try {
            const initialized = await this.eyeTracker.initialize();
            if (!initialized) {
                console.error('Eye tracking initialization failed');
                // 继续实验，但不进行眼动追踪
                return;
            }
        } catch (error) {
            console.error('Eye tracking error:', error);
            // 继续实验，但不进行眼动追踪
        }
    }

    setupEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => this.startPractice());
        document.getElementById('startRealTest').addEventListener('click', () => this.startExperiment());
    }

    startPractice() {
        document.getElementById('welcome').classList.remove('active');
        document.getElementById('practice').classList.add('active');
        this.showPracticeTask();
    }

    showPracticeTask() {
        const practiceContent = document.getElementById('practiceContent');
        const task = experimentConfig.practiceTask;
        
        // 创建任务内容
        practiceContent.innerHTML = `
            <div class="task-instruction">
                <p>${task.question}</p>
                <p>这是练习任务，请观察图片并输入答案。</p>
            </div>
            <div class="image-container">
                <img src="${task.image}" alt="练习任务图片" style="max-width: 100%;">
            </div>
            <div class="answer-container">
                <input type="number" class="answer-input" placeholder="请输入心率值">
                <button class="submit-btn" onclick="handlePracticeSubmit()">提交答案</button>
            </div>
        `;

        // 添加提交事件处理
        const submitBtn = practiceContent.querySelector('.submit-btn');
        submitBtn.addEventListener('click', () => this.handlePracticeSubmit());
    }

    handlePracticeSubmit() {
        const task = experimentConfig.practiceTask;
        const input = document.querySelector('#practiceContent .answer-input');
        const answer = input.value.trim();
        
        if (answer === task.correctAnswer) {
            alert('做得好！你已完成练习任务。');
            document.getElementById('startRealTest').style.display = 'block';
        } else {
            alert('答案不正确，请重试。');
            input.value = '';
            input.focus();
        }
    }

    async startExperiment() {
        document.getElementById('practice').classList.remove('active');
        document.getElementById('experiment').classList.add('active');
        await this.runExperimentTask();
    }

    async runExperimentTask() {
        if (this.currentTask >= experimentConfig.experimentTasks.length) {
            this.showResults();
            return;
        }

        const task = experimentConfig.experimentTasks[this.currentTask];
        
        // 显示任务问题
        await this.showElement('taskQuestion', experimentConfig.timing.questionDisplay);
        
        // 显示黑屏
        await this.wait(experimentConfig.timing.blackScreen);
        
        // 显示注视点
        await this.showElement('fixationPoint', experimentConfig.timing.fixationPoint);
        
        // 显示实验界面
        this.showExperimentInterface(task);
    }

    async showElement(elementId, duration) {
        const element = document.getElementById(elementId);
        element.style.display = 'block';
        await this.wait(duration);
        element.style.display = 'none';
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showResults() {
        document.getElementById('experiment').classList.remove('active');
        document.getElementById('results').classList.add('active');
        
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = `
            <h3>实验结果统计</h3>
            <div class="results-summary">
                ${this.results.map((result, index) => `
                    <div class="result-item">
                        <h4>任务 ${index + 1}</h4>
                        <p>答案: ${result.answer}</p>
                        <p>正确性: ${result.correct ? '正确' : '错误'}</p>
                        <p>反应时间: ${(result.reactionTime / 1000).toFixed(2)}秒</p>
                        ${result.heatmap ? `
                            <div class="task-heatmap">
                                <h5>眼动轨迹热力图</h5>
                                <img src="${result.heatmap}" alt="眼动热力图">
                            </div>
                        ` : '<p>眼动数据不可用</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    showExperimentInterface(task) {
        const content = document.getElementById('experimentContent');
        content.innerHTML = `
            <div class="task-container">
                <img src="${task.image}" alt="实验任务图片" style="max-width: 100%;">
                <div class="answer-container">
                    <input type="number" class="answer-input" placeholder="请输入心率值">
                    <button class="submit-btn">提交答案</button>
                </div>
            </div>
        `;
        // 使用新的显示类
        content.classList.add('show');

        // 开始眼动追踪
        this.eyeTracker.startTracking();

        const startTime = Date.now();
        const submitBtn = content.querySelector('.submit-btn');
        
        submitBtn.addEventListener('click', () => {
            const endTime = Date.now();
            this.eyeTracker.stopTracking();
            this.handleTaskSubmit(task, startTime, endTime);
        });

        // 设置任务超时
        setTimeout(() => {
            if (content.classList.contains('show')) {
                this.handleTimeout(task);
            }
        }, task.timeout);
    }

    handleTaskSubmit(task, startTime, endTime) {
        const input = document.querySelector('#experimentContent .answer-input');
        const answer = input.value.trim();
        const reactionTime = endTime - startTime;

        // 生成热力图
        let heatmapData = null;
        try {
            heatmapData = this.eyeTracker.generateHeatmap(800, 600);
        } catch (error) {
            console.error('Error generating heatmap:', error);
        }

        // 记录结果
        this.results.push({
            taskId: task.id,
            answer: answer,
            correct: answer === task.correctAnswer,
            reactionTime: reactionTime,
            heatmap: heatmapData
        });

        // 隐藏当前任务界面
        document.getElementById('experimentContent').classList.remove('show');

        // 进入下一个任务
        this.currentTask++;
        this.runExperimentTask();
    }

    isClickInCorrectArea(x, y, correctArea) {
        return (
            x >= correctArea.x &&
            x <= correctArea.x + correctArea.width &&
            y >= correctArea.y &&
            y <= correctArea.y + correctArea.height
        );
    }

    handleTimeout(task) {
        // 记录超时结果
        this.results.push({
            taskId: task.id,
            answer: '超时',
            correct: false,
            reactionTime: task.timeout
        });

        // 隐藏当前任务界面
        document.getElementById('experimentContent').classList.remove('show');

        // 进入下一个任务
        this.currentTask++;
        this.runExperimentTask();
    }
}

// 当页面加载完成时初始化实验
document.addEventListener('DOMContentLoaded', () => {
    new ExperimentManager();
}); 
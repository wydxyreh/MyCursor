const experimentConfig = {
    practiceTask: {
        question: "请输入当前患者的心率值",
        image: "./images/practice/practice.jpg",
        correctAnswer: "75",  // 根据实际图片修改正确答案
        timeout: 10000    // 练习任务超时时间（毫秒）
    },
    
    experimentTasks: [
        {
            id: 1,
            question: "请输入当前患者的心率值",
            image: "./images/tasks/task1.jpg",
            correctAnswer: "82",  // 根据实际图片修改正确答案
            timeout: 5000
        },
        {
            id: 2,
            question: "请输入当前患者的心率值",
            image: "./images/tasks/task2.jpg",
            correctAnswer: "68",  // 根据实际图片修改正确答案
            timeout: 5000
        }
        // 可以继续添加更多任务...
    ],
    
    timing: {
        questionDisplay: 500,    // 问题显示时间
        blackScreen: 2000,       // 黑屏时间
        fixationPoint: 500,      // 注视点显示时间
        restBetweenTasks: 500    // 任务间休息时间
    }
}; 
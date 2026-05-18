// ProLATO - 流程工业AI咨询平台

(function() {
    'use strict';

    // ========== 状态管理 ==========
    const state = {
        industry: 'chemical',
        role: 'owner',
        messages: [],
        isTyping: false,
        sidebarOpen: true
    };

    const industries = {
        chemical: '化工行业',
        mining: '有色矿山行业',
        food: '食品饮料行业',
        solar: '玻璃光伏行业',
        steel: '钢铁行业',
        pharma: '制药行业'
    };

    const roles = {
        owner: '企业老板',
        executive: '决策层',
        manager: '部门管理者',
        operator: '一线操作员工'
    };

    const roleAvatars = {
        owner: '老',
        executive: '决',
        manager: '管',
        operator: '员'
    };

    // ========== DOM 元素 ==========
    const elements = {
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'),
        industryItems: document.querySelectorAll('.industry-item'),
        roleTabs: document.querySelectorAll('.role-tab'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        messagesList: document.getElementById('messagesList'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        newChatBtn: document.getElementById('newChatBtn'),
        contextIndustry: document.getElementById('contextIndustry'),
        contextRole: document.getElementById('contextRole'),
        taskCards: document.querySelectorAll('.task-card'),
        promptChips: document.querySelectorAll('.prompt-chip')
    };

    // ========== 初始化 ==========
    function init() {
        bindEvents();
        updateContextDisplay();
        initInputAutoResize();
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        // 侧边栏切换
        elements.sidebarToggle.addEventListener('click', toggleSidebar);

        // 行业选择
        elements.industryItems.forEach(item => {
            item.addEventListener('click', () => selectIndustry(item.dataset.industry));
        });

        // 角色选择
        elements.roleTabs.forEach(tab => {
            tab.addEventListener('click', () => selectRole(tab.dataset.role));
        });

        // 任务类型选择
        elements.taskCards.forEach(card => {
            card.addEventListener('click', () => {
                const taskType = card.dataset.task;
                selectTaskType(taskType);
            });
        });

        // 快速提示
        elements.promptChips.forEach(chip => {
            chip.addEventListener('click', () => {
                elements.messageInput.value = chip.dataset.prompt;
                updateSendButton();
                elements.messageInput.focus();
            });
        });

        // 输入框
        elements.messageInput.addEventListener('input', updateSendButton);
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // 发送按钮
        elements.sendBtn.addEventListener('click', sendMessage);

        // 新对话
        elements.newChatBtn.addEventListener('click', startNewChat);

        // 点击遮罩关闭侧边栏（移动端）
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const isSidebar = elements.sidebar.contains(e.target);
                const isToggle = elements.sidebarToggle.contains(e.target);
                if (!isSidebar && !isToggle && elements.sidebar.classList.contains('open')) {
                    closeSidebar();
                }
            }
        });

        // 窗口大小变化
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                elements.sidebar.classList.remove('open');
                removeOverlay();
            }
        });
    }

    // ========== 侧边栏 ==========
    function toggleSidebar() {
        if (window.innerWidth <= 768) {
            elements.sidebar.classList.toggle('open');
            toggleOverlay();
        } else {
            elements.sidebar.classList.toggle('collapsed');
            state.sidebarOpen = !elements.sidebar.classList.contains('collapsed');
        }
    }

    function closeSidebar() {
        elements.sidebar.classList.remove('open');
        removeOverlay();
    }

    function toggleOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        overlay.classList.toggle('active');
    }

    function removeOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // ========== 行业选择 ==========
    function selectIndustry(industry) {
        if (['solar', 'steel', 'pharma'].includes(industry)) {
            showToast('该行业即将上线，敬请期待');
            return;
        }

        state.industry = industry;
        elements.industryItems.forEach(item => {
            item.classList.toggle('active', item.dataset.industry === industry);
        });
        updateContextDisplay();
        updateQuickPrompts();
    }

    // ========== 角色选择 ==========
    function selectRole(role) {
        state.role = role;
        elements.roleTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.role === role);
        });
        updateContextDisplay();
    }

    // ========== 任务类型选择 ==========
    function selectTaskType(taskType) {
        const taskPrompts = {
            qa: '我想咨询关于',
            solution: '请帮我编写一份',
            architecture: '请帮我设计',
            validate: '请帮我验证'
        };

        const industryName = industries[state.industry];
        const roleName = roles[state.role];

        let prompt = '';
        switch (taskType) {
            case 'qa':
                prompt = `作为${industryName}的${roleName}，我想了解：`;
                break;
            case 'solution':
                prompt = `作为${industryName}的${roleName}，请帮我编写一份数字化转型解决方案，目标场景：`;
                break;
            case 'architecture':
                prompt = `作为${industryName}的${roleName}，请帮我设计以下系统架构：`;
                break;
            case 'validate':
                prompt = `作为${industryName}的${roleName}，请帮我验证以下供应商方案：`;
                break;
        }

        elements.messageInput.value = prompt;
        updateSendButton();
        elements.messageInput.focus();
    }

    // ========== 更新上下文显示 ==========
    function updateContextDisplay() {
        elements.contextIndustry.textContent = industries[state.industry];
        elements.contextRole.textContent = roles[state.role];
    }

    // ========== 更新快速提示 ==========
    function updateQuickPrompts() {
        const prompts = {
            chemical: [
                '如何制定化工行业的数字化转型路线图？',
                '智能工厂建设中DCS和MES如何协同？',
                '化工企业安全生产数字化管控方案',
                '帮我设计一个化工园区的智慧HSE架构'
            ],
            mining: [
                '有色矿山行业智能选矿系统的关键技术有哪些？',
                '矿山数字化转型中无人驾驶技术的应用方案',
                '如何构建矿山设备的预测性维护系统？',
                '智能矿山建设的总体架构设计'
            ],
            food: [
                '食品饮料行业的MES系统如何与ERP集成？',
                '食品企业质量追溯系统建设方案',
                '智能工厂中食品安全数字化管控要点',
                '食品饮料行业智能仓储物流解决方案'
            ]
        };

        const currentPrompts = prompts[state.industry] || prompts.chemical;
        elements.promptChips.forEach((chip, index) => {
            if (currentPrompts[index]) {
                chip.textContent = currentPrompts[index];
                chip.dataset.prompt = currentPrompts[index];
            }
        });
    }

    // ========== 发送消息 ==========
    function sendMessage() {
        const content = elements.messageInput.value.trim();
        if (!content || state.isTyping) return;

        // 添加用户消息
        addMessage('user', content);
        elements.messageInput.value = '';
        updateSendButton();
        resetInputHeight();

        // 显示AI正在输入
        showTypingIndicator();

        // 模拟AI回复（实际项目中替换为API调用）
        setTimeout(() => {
            hideTypingIndicator();
            const response = generateResponse(content);
            addMessage('ai', response);
        }, 1500 + Math.random() * 1000);
    }

    // ========== 生成回复（演示用） ==========
    function generateResponse(userMessage) {
        const industry = industries[state.industry];
        const role = roles[state.role];

        if (userMessage.includes('架构') || userMessage.includes('设计')) {
            return `作为${industry}的${role}，针对您的架构设计需求，我建议采用以下分层架构：

**1. 边缘层（Edge Layer）**
- 部署工业网关和边缘计算节点
- 实现设备数据采集和协议转换
- 本地实时控制和边缘AI推理

**2. 平台层（Platform Layer）**
- 工业物联网平台（IIoT）
- 数据湖/数据仓库
- AI/ML模型训练与推理服务
- 数字孪生引擎

**3. 应用层（Application Layer）**
- MES、ERP、CRM等业务系统
- 可视化大屏和移动端应用
- 智能决策支持系统

**4. 安全层（Security Layer）**
- 零信任安全架构
- 数据加密和访问控制
- 安全运营中心（SOC）

这个架构可以根据您的具体需求进行调整。您希望我针对哪个层级进行更详细的设计？`;
        }

        if (userMessage.includes('方案') || userMessage.includes('解决')) {
            return `感谢您的咨询。作为${industry}领域的AI咨询专家，我为您梳理以下数字化解决方案框架：

**现状诊断**
首先需要对当前数字化成熟度进行评估，识别核心痛点和改进空间。

**目标设定**
- 短期目标（6-12个月）：数据互联互通、关键设备联网
- 中期目标（1-2年）：核心系统上线、数据驱动决策
- 长期目标（3-5年）：全面智能化、自主优化运营

**实施路径**
1. 基础设施建设期
2. 系统集成与数据治理期
3. 智能化应用推广期
4. 持续优化与创新期

**预期收益**
- 生产效率提升 15-25%
- 设备故障率降低 30-40%
- 能耗优化 10-20%
- 质量合格率提升 5-10%

您希望深入了解哪个阶段的具体实施细节？`;
        }

        if (userMessage.includes('问答') || userMessage.includes('了解') || userMessage.includes('咨询')) {
            return `您好！作为${industry}领域的AI咨询助手，我很高兴为您解答。

针对${role}关注的问题，我建议从以下几个维度进行思考：

**战略层面**
- 行业数字化发展趋势和政策导向
- 竞争对手数字化水平对标分析
- 数字化转型ROI测算方法

**技术层面**
- 主流技术栈和选型建议
- 新旧系统兼容性考量
- 数据标准和接口规范

**运营层面**
- 组织变革和人才培养
- 变革管理和用户采纳
- 持续运营和迭代优化

请问您具体想了解哪个方面的内容？我可以为您提供更深入的解答。`;
        }

        return `感谢您的提问。作为${industry}领域的AI咨询专家，我已收到您的需求。

基于您作为${role}的视角，我会从行业最佳实践、技术可行性和商业价值三个维度为您提供专业建议。

由于当前处于演示模式，我的回复基于预设模板。在实际部署后，我将调用 ProLATO-1.0 模型，结合您的具体行业知识和角色需求，生成更加精准和个性化的咨询内容。

您可以通过以下方式与我互动：
- 描述具体的业务场景或痛点
- 询问特定技术或方案的细节
- 要求我生成架构图或方案文档

请问还有什么我可以帮您的？`;
    }

    // ========== 添加消息 ==========
    function addMessage(type, content) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;

        const avatar = type === 'user' ? '您' : 'AI';
        const author = type === 'user' ? '您' : 'ProLATO';
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-body">${formatContent(content)}</div>
            </div>
        `;

        elements.messagesList.appendChild(messageEl);
        scrollToBottom();

        // 保存到状态
        state.messages.push({ type, content, time });
    }

    // ========== 格式化内容 ==========
    function formatContent(content) {
        // 处理粗体
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // 处理换行
        content = content.replace(/\n/g, '<br>');
        // 处理列表
        content = content.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        content = content.replace(/(<li>.+<\/li>\n?)+/g, '<ol>$&</ol>');
        content = content.replace(/<ol>(<li>.+<\/li>\n?)+<\/ol>/g, match => match.replace(/<\/li>\n<li>/g, '</li><li>'));

        return content;
    }

    // ========== 显示/隐藏打字指示器 ==========
    function showTypingIndicator() {
        state.isTyping = true;
        const typingEl = document.createElement('div');
        typingEl.className = 'message ai typing';
        typingEl.id = 'typingIndicator';
        typingEl.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">ProLATO</span>
                </div>
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        elements.messagesList.appendChild(typingEl);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        state.isTyping = false;
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) {
            typingEl.remove();
        }
    }

    // ========== 滚动到底部 ==========
    function scrollToBottom() {
        elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
    }

    // ========== 更新发送按钮状态 ==========
    function updateSendButton() {
        const hasContent = elements.messageInput.value.trim().length > 0;
        elements.sendBtn.disabled = !hasContent;
    }

    // ========== 输入框自动调整高度 ==========
    function initInputAutoResize() {
        elements.messageInput.addEventListener('input', () => {
            elements.messageInput.style.height = 'auto';
            elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 200) + 'px';
        });
    }

    function resetInputHeight() {
        elements.messageInput.style.height = 'auto';
    }

    // ========== 新对话 ==========
    function startNewChat() {
        state.messages = [];
        elements.messagesList.innerHTML = '';
        elements.messagesList.classList.remove('active');
        elements.welcomeScreen.style.display = 'flex';
        elements.messageInput.value = '';
        updateSendButton();
        resetInputHeight();
    }

    // ========== 切换到对话视图 ==========
    function switchToChatView() {
        elements.welcomeScreen.style.display = 'none';
        elements.messagesList.classList.add('active');
    }

    // 重写 addMessage 以在第一条消息时切换视图
    const originalAddMessage = addMessage;
    function addMessageWithViewSwitch(type, content) {
        if (state.messages.length === 0) {
            switchToChatView();
        }
        originalAddMessage(type, content);
    }

    // 替换 addMessage 引用
    // 注意：这里我们实际上需要确保 sendMessage 调用的是新的 addMessage
    // 由于函数提升，我们重新定义

    // 修复：确保第一条消息时切换视图
    const _addMessage = addMessage;
    addMessage = function(type, content) {
        if (state.messages.length === 0 && type === 'user') {
            switchToChatView();
        }
        _addMessage(type, content);
    };

    // ========== Toast 提示 ==========
    function showToast(message) {
        const existing = document.querySelector('.toast-message');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--text-primary);
            color: white;
            padding: 10px 20px;
            border-radius: var(--radius-md);
            font-size: 14px;
            z-index: 1000;
            animation: toastIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // 添加 toast 动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
    `;
    document.head.appendChild(style);

    // ========== 启动 ==========
    init();
})();

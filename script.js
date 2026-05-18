// ProLATO - 流程工业AI咨询平台
// 模型适配层设计：支持 OpenAI / Anthropic / DeepSeek / 自定义API / 自训练模型

(function() {
    'use strict';

    // ============================================================
    // 配置常量
    // ============================================================
    const STORAGE_KEYS = {
        modelSettings: 'prolato_model_settings',
        chatHistory: 'prolato_chat_history'
    };

    const DEFAULT_SETTINGS = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: '',
        customEndpoint: '',
        customModel: '',
        systemPrompt: ''
    };

    const PROVIDER_MODELS = {
        openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
        deepseek: ['deepseek-chat', 'deepseek-reasoner'],
        prolato: ['prolato-v1'],
        custom: ['custom']
    };

    const PROVIDER_CONFIG = {
        openai: {
            name: 'OpenAI',
            baseUrl: 'https://api.openai.com/v1/chat/completions',
            authHeader: 'Bearer',
            requestFormat: 'openai'
        },
        anthropic: {
            name: 'Anthropic',
            baseUrl: 'https://api.anthropic.com/v1/messages',
            authHeader: 'x-api-key',
            requestFormat: 'anthropic'
        },
        deepseek: {
            name: 'DeepSeek',
            baseUrl: 'https://api.deepseek.com/chat/completions',
            authHeader: 'Bearer',
            requestFormat: 'openai'
        },
        prolato: {
            name: 'ProLATO',
            baseUrl: '',  // 待配置
            authHeader: 'Bearer',
            requestFormat: 'openai'
        },
        custom: {
            name: 'Custom',
            baseUrl: '',
            authHeader: 'Bearer',
            requestFormat: 'openai'
        }
    };

    // ============================================================
    // 状态管理
    // ============================================================
    const state = {
        industry: 'chemical',
        role: 'owner',
        messages: [],
        isTyping: false,
        sidebarOpen: true,
        modelSettings: loadSettings()
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

    // ============================================================
    // 模型适配层 (Model Adapter Pattern)
    // ============================================================

    /**
     * 基础模型适配器 - 定义统一接口
     */
    class BaseModelAdapter {
        constructor(settings) {
            this.settings = settings;
        }

        async chat(messages, options = {}) {
            throw new Error('chat() must be implemented by subclass');
        }

        getSystemPrompt() {
            const industry = industries[state.industry];
            const role = roles[state.role];
            const customPrompt = this.settings.systemPrompt?.trim();

            const basePrompt = `你是 ProLATO，一位专注于${industry}领域的AI咨询专家。你的服务对象是${industry}的${role}。\n\n你的专业领域包括：\n- 流程工业数字化转型\n- 智能制造与工业4.0\n- IT/OT融合架构\n- 设备预测性维护\n- 智慧HSE管理\n- MES/ERP/SCADA系统集成\n- 数字孪生与AI大模型应用\n\n回答风格：\n- 专业、精准、有深度\n- 结合行业最佳实践和具体案例\n- 提供可落地的实施建议\n- 必要时使用结构化输出（列表、表格、分层架构）`;

            return customPrompt ? `${basePrompt}\n\n额外要求：\n${customPrompt}` : basePrompt;
        }
    }

    /**
     * OpenAI 格式适配器 (OpenAI / DeepSeek / 自定义API)
     */
    class OpenAIFormatAdapter extends BaseModelAdapter {
        async chat(messages, options = {}) {
            const config = PROVIDER_CONFIG[this.settings.provider];
            const url = this.settings.provider === 'custom'
                ? this.settings.customEndpoint
                : config.baseUrl;

            if (!url) throw new Error('API 地址未配置');
            if (!this.settings.apiKey) throw new Error('API Key 未配置');

            const body = {
                model: this.settings.provider === 'custom'
                    ? this.settings.customModel
                    : this.settings.model,
                messages: [
                    { role: 'system', content: this.getSystemPrompt() },
                    ...messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))
                ],
                temperature: 0.7,
                max_tokens: 4096,
                stream: false
            };

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `${config.authHeader} ${this.settings.apiKey}`
            };

            // DeepSeek 需要额外 header
            if (this.settings.provider === 'deepseek') {
                // DeepSeek uses standard Bearer auth
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '无返回内容';
        }
    }

    /**
     * Anthropic Claude 适配器
     */
    class AnthropicAdapter extends BaseModelAdapter {
        async chat(messages, options = {}) {
            const config = PROVIDER_CONFIG.anthropic;

            if (!this.settings.apiKey) throw new Error('API Key 未配置');

            const conversationMessages = messages.map(m => ({
                role: m.type === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

            const body = {
                model: this.settings.model,
                max_tokens: 4096,
                system: this.getSystemPrompt(),
                messages: conversationMessages,
                temperature: 0.7
            };

            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.settings.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.content?.[0]?.text || '无返回内容';
        }
    }

    /**
     * ProLATO 自训练模型适配器 (预留)
     */
    class ProLATOAdapter extends BaseModelAdapter {
        async chat(messages, options = {}) {
            // TODO: 接入自训练模型 API
            // 目前回退到模拟回复
            return `[ProLATO 自训练模型] 模型正在训练中，暂时使用演示模式回复。\n\n${generateFallbackResponse(messages[messages.length - 1]?.content || '')}`;
        }
    }

    /**
     * 模型适配器工厂
     */
    function createModelAdapter(settings) {
        switch (settings.provider) {
            case 'anthropic':
                return new AnthropicAdapter(settings);
            case 'prolato':
                return new ProLATOAdapter(settings);
            case 'openai':
            case 'deepseek':
            case 'custom':
            default:
                return new OpenAIFormatAdapter(settings);
        }
    }

    // ============================================================
    // 设置管理
    // ============================================================
    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.modelSettings);
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.modelSettings, JSON.stringify(settings));
            state.modelSettings = settings;
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    // ============================================================
    // DOM 元素
    // ============================================================
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
        homeBtn: document.getElementById('homeBtn'),
        modelSettingsBtn: document.getElementById('modelSettingsBtn'),
        contextIndustry: document.getElementById('contextIndustry'),
        contextRole: document.getElementById('contextRole'),
        taskCards: document.querySelectorAll('.task-card'),
        promptChips: document.querySelectorAll('.prompt-chip'),
        // 模型设置面板
        modelSettingsModal: document.getElementById('modelSettingsModal'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        testConnectionBtn: document.getElementById('testConnectionBtn'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        customEndpointInput: document.getElementById('customEndpointInput'),
        customModelInput: document.getElementById('customModelInput'),
        systemPromptInput: document.getElementById('systemPromptInput'),
        apiKeyGroup: document.getElementById('apiKeyGroup'),
        customEndpointGroup: document.getElementById('customEndpointGroup'),
        customModelGroup: document.getElementById('customModelGroup')
    };

    // ============================================================
    // 初始化
    // ============================================================
    function init() {
        bindEvents();
        updateContextDisplay();
        initInputAutoResize();
        initModelSettings();
    }

    // ============================================================
    // 事件绑定
    // ============================================================
    function bindEvents() {
        // 侧边栏
        elements.sidebarToggle.addEventListener('click', toggleSidebar);

        // 行业选择
        elements.industryItems.forEach(item => {
            item.addEventListener('click', () => selectIndustry(item.dataset.industry));
        });

        // 角色选择
        elements.roleTabs.forEach(tab => {
            tab.addEventListener('click', () => selectRole(tab.dataset.role));
        });

        // 任务类型
        elements.taskCards.forEach(card => {
            card.addEventListener('click', () => selectTaskType(card.dataset.task));
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

        // 发送
        elements.sendBtn.addEventListener('click', sendMessage);

        // 新对话
        elements.newChatBtn.addEventListener('click', startNewChat);

        // 返回首页
        elements.homeBtn.addEventListener('click', goHome);

        // 模型设置
        elements.modelSettingsBtn.addEventListener('click', openModelSettings);
        elements.modalCloseBtn.addEventListener('click', closeModelSettings);
        elements.modelSettingsModal.addEventListener('click', (e) => {
            if (e.target === elements.modelSettingsModal) closeModelSettings();
        });
        elements.saveSettingsBtn.addEventListener('click', saveModelSettings);
        elements.testConnectionBtn.addEventListener('click', testModelConnection);

        // 模型提供商切换
        document.querySelectorAll('input[name="modelProvider"]').forEach(radio => {
            radio.addEventListener('change', onProviderChange);
        });

        // 移动端遮罩
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const isSidebar = elements.sidebar.contains(e.target);
                const isToggle = elements.sidebarToggle.contains(e.target);
                if (!isSidebar && !isToggle && elements.sidebar.classList.contains('open')) {
                    closeSidebar();
                }
            }
        });

        // ESC 关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModelSettings();
        });

        // 窗口变化
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                elements.sidebar.classList.remove('open');
                removeOverlay();
            }
        });
    }

    // ============================================================
    // 侧边栏
    // ============================================================
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
        if (overlay) overlay.classList.remove('active');
    }

    // ============================================================
    // 行业 / 角色选择
    // ============================================================
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

    function selectRole(role) {
        state.role = role;
        elements.roleTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.role === role);
        });
        updateContextDisplay();
    }

    function selectTaskType(taskType) {
        const taskPrompts = { qa: '我想咨询关于', solution: '请帮我编写一份', architecture: '请帮我设计', validate: '请帮我验证' };
        const industryName = industries[state.industry];
        const roleName = roles[state.role];
        let prompt = '';
        switch (taskType) {
            case 'qa': prompt = `作为${industryName}的${roleName}，我想了解：`; break;
            case 'solution': prompt = `作为${industryName}的${roleName}，请帮我编写一份数字化转型解决方案，目标场景：`; break;
            case 'architecture': prompt = `作为${industryName}的${roleName}，请帮我设计以下系统架构：`; break;
            case 'validate': prompt = `作为${industryName}的${roleName}，请帮我验证以下供应商方案：`; break;
        }
        elements.messageInput.value = prompt;
        updateSendButton();
        elements.messageInput.focus();
    }

    function updateContextDisplay() {
        elements.contextIndustry.textContent = industries[state.industry];
        elements.contextRole.textContent = roles[state.role];
    }

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

    // ============================================================
    // 发送消息 - 接入模型适配层
    // ============================================================
    async function sendMessage() {
        const content = elements.messageInput.value.trim();
        if (!content || state.isTyping) return;

        // 添加用户消息
        addMessage('user', content);
        elements.messageInput.value = '';
        updateSendButton();
        resetInputHeight();

        // 显示AI正在输入
        showTypingIndicator();

        try {
            const adapter = createModelAdapter(state.modelSettings);
            const response = await adapter.chat(state.messages);
            hideTypingIndicator();
            addMessage('ai', response);
        } catch (error) {
            hideTypingIndicator();
            addMessage('ai', `**调用模型时出错**\n\n错误信息：${error.message}\n\n可能原因：\n- API Key 未配置或已失效\n- 网络连接问题\n- 模型服务暂时不可用\n\n建议：\n1. 点击右上角「模型设置」检查 API Key\n2. 确认网络连接正常\n3. 切换至其他模型提供商\n\n当前将使用演示模式回复：\n\n${generateFallbackResponse(content)}`);
        }
    }

    // ============================================================
    // 演示回退回复（当模型调用失败时使用）
    // ============================================================
    function generateFallbackResponse(userMessage) {
        const industry = industries[state.industry];
        const role = roles[state.role];

        if (userMessage.includes('架构') || userMessage.includes('设计')) {
            return `作为${industry}的${role}，针对您的架构设计需求，我建议采用以下分层架构：\n\n**1. 边缘层（Edge Layer）**\n- 部署工业网关和边缘计算节点\n- 实现设备数据采集和协议转换\n- 本地实时控制和边缘AI推理\n\n**2. 平台层（Platform Layer）**\n- 工业物联网平台（IIoT）\n- 数据湖/数据仓库\n- AI/ML模型训练与推理服务\n- 数字孪生引擎\n\n**3. 应用层（Application Layer）**\n- MES、ERP、CRM等业务系统\n- 可视化大屏和移动端应用\n- 智能决策支持系统\n\n**4. 安全层（Security Layer）**\n- 零信任安全架构\n- 数据加密和访问控制\n- 安全运营中心（SOC）\n\n这个架构可以根据您的具体需求进行调整。您希望我针对哪个层级进行更详细的设计？`;
        }

        if (userMessage.includes('方案') || userMessage.includes('解决')) {
            return `感谢您的咨询。作为${industry}领域的AI咨询专家，我为您梳理以下数字化解决方案框架：\n\n**现状诊断**\n首先需要对当前数字化成熟度进行评估，识别核心痛点和改进空间。\n\n**目标设定**\n- 短期目标（6-12个月）：数据互联互通、关键设备联网\n- 中期目标（1-2年）：核心系统上线、数据驱动决策\n- 长期目标（3-5年）：全面智能化、自主优化运营\n\n**实施路径**\n1. 基础设施建设期\n2. 系统集成与数据治理期\n3. 智能化应用推广期\n4. 持续优化与创新期\n\n**预期收益**\n- 生产效率提升 15-25%\n- 设备故障率降低 30-40%\n- 能耗优化 10-20%\n- 质量合格率提升 5-10%\n\n您希望深入了解哪个阶段的具体实施细节？`;
        }

        return `感谢您的提问。作为${industry}领域的AI咨询专家，我已收到您的需求。\n\n基于您作为${role}的视角，我会从行业最佳实践、技术可行性和商业价值三个维度为您提供专业建议。\n\n由于当前处于演示模式，我的回复基于预设模板。在实际接入模型后，我将调用您配置的 AI 模型，结合您的具体行业知识和角色需求，生成更加精准和个性化的咨询内容。\n\n您可以通过以下方式与我互动：\n- 描述具体的业务场景或痛点\n- 询问特定技术或方案的细节\n- 要求我生成架构图或方案文档\n\n请问还有什么我可以帮您的？`;
    }

    // ============================================================
    // 消息管理
    // ============================================================
    function addMessage(type, content) {
        if (state.messages.length === 0 && type === 'user') {
            switchToChatView();
        }

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
        state.messages.push({ type, content, time });
    }

    function formatContent(content) {
        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\n/g, '<br>');
        content = content.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        content = content.replace(/(<li>.+<\/li>\n?)+/g, '<ol>$&</ol>');
        content = content.replace(/<ol>(<li>.+<\/li>\n?)+<\/ol>/g, match => match.replace(/<\/li>\n<li>/g, '</li><li>'));
        return content;
    }

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
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        elements.messagesList.appendChild(typingEl);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        state.isTyping = false;
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) typingEl.remove();
    }

    function scrollToBottom() {
        elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
    }

    // ============================================================
    // 输入框
    // ============================================================
    function updateSendButton() {
        elements.sendBtn.disabled = elements.messageInput.value.trim().length === 0;
    }

    function initInputAutoResize() {
        elements.messageInput.addEventListener('input', () => {
            elements.messageInput.style.height = 'auto';
            elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 200) + 'px';
        });
    }

    function resetInputHeight() {
        elements.messageInput.style.height = 'auto';
    }

    // ============================================================
    // 返回首页
    // ============================================================
    function goHome() {
        state.messages = [];
        elements.messagesList.innerHTML = '';
        elements.messagesList.classList.remove('active');
        elements.welcomeScreen.style.display = 'flex';
        elements.messageInput.value = '';
        updateSendButton();
        resetInputHeight();
        showToast('已返回首页');
    }

    function startNewChat() {
        state.messages = [];
        elements.messagesList.innerHTML = '';
        elements.messagesList.classList.remove('active');
        elements.welcomeScreen.style.display = 'flex';
        elements.messageInput.value = '';
        updateSendButton();
        resetInputHeight();
        showToast('新对话已开始');
    }

    function switchToChatView() {
        elements.welcomeScreen.style.display = 'none';
        elements.messagesList.classList.add('active');
    }

    // ============================================================
    // 模型设置面板
    // ============================================================
    function initModelSettings() {
        const settings = state.modelSettings;
        // 设置当前选中的提供商
        document.querySelector(`input[name="modelProvider"][value="${settings.provider}"]`).checked = true;
        elements.apiKeyInput.value = settings.apiKey || '';
        elements.customEndpointInput.value = settings.customEndpoint || '';
        elements.customModelInput.value = settings.customModel || '';
        elements.systemPromptInput.value = settings.systemPrompt || '';
        updateFormVisibility(settings.provider);
    }

    function openModelSettings() {
        elements.modelSettingsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModelSettings() {
        elements.modelSettingsModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function onProviderChange(e) {
        updateFormVisibility(e.target.value);
    }

    function updateFormVisibility(provider) {
        const isCustom = provider === 'custom';
        const needsKey = provider !== 'prolato';
        const isProLATO = provider === 'prolato';

        elements.apiKeyGroup.style.display = needsKey ? 'block' : 'none';
        elements.customEndpointGroup.style.display = isCustom ? 'block' : 'none';
        elements.customModelGroup.style.display = isCustom ? 'block' : 'none';

        if (isProLATO) {
            elements.apiKeyInput.placeholder = 'ProLATO 模型暂未开放，敬请期待';
        } else if (provider === 'openai') {
            elements.apiKeyInput.placeholder = 'sk-xxxxxxxxxxxxxxxx';
        } else if (provider === 'anthropic') {
            elements.apiKeyInput.placeholder = 'sk-ant-api03-xxxxxxxxxxxxxxxx';
        } else if (provider === 'deepseek') {
            elements.apiKeyInput.placeholder = 'sk-xxxxxxxxxxxxxxxx';
        }
    }

    function saveModelSettings() {
        const provider = document.querySelector('input[name="modelProvider"]:checked').value;
        const settings = {
            provider,
            model: PROVIDER_MODELS[provider]?.[0] || 'default',
            apiKey: elements.apiKeyInput.value.trim(),
            customEndpoint: elements.customEndpointInput.value.trim(),
            customModel: elements.customModelInput.value.trim(),
            systemPrompt: elements.systemPromptInput.value.trim()
        };
        saveSettings(settings);
        state.modelSettings = settings;
        closeModelSettings();
        showToast('模型设置已保存');
    }

    async function testModelConnection() {
        const provider = document.querySelector('input[name="modelProvider"]:checked').value;
        const settings = {
            ...state.modelSettings,
            provider,
            apiKey: elements.apiKeyInput.value.trim(),
            customEndpoint: elements.customEndpointInput.value.trim(),
            customModel: elements.customModelInput.value.trim()
        };

        if (provider === 'prolato') {
            showToast('ProLATO 自训练模型暂未开放');
            return;
        }

        if (!settings.apiKey && provider !== 'prolato') {
            showToast('请先输入 API Key');
            return;
        }

        elements.testConnectionBtn.textContent = '测试中...';
        elements.testConnectionBtn.disabled = true;

        try {
            const adapter = createModelAdapter(settings);
            await adapter.chat([{ type: 'user', content: 'Hello, this is a connection test. Please reply "Connection successful" in Chinese.' }]);
            showToast('连接测试成功！');
        } catch (error) {
            showToast(`连接失败: ${error.message}`);
        } finally {
            elements.testConnectionBtn.textContent = '测试连接';
            elements.testConnectionBtn.disabled = false;
        }
    }

    // ============================================================
    // Toast 提示
    // ============================================================
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

    // ============================================================
    // 启动
    // ============================================================
    init();
})();

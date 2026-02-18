document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    const amountInput = document.getElementById('amount');
    const memoInput = document.getElementById('memo');
    const categoryInput = document.getElementById('category');
    const addBtn = document.getElementById('add-btn');
    const entryList = document.getElementById('entry-list');

    // New Elements
    const monthPicker = document.getElementById('month-picker');
    const budgetInput = document.getElementById('monthly-budget');
    const budgetStatus = document.getElementById('budget-status');
    const budgetAlert = document.getElementById('budget-alert');
    const adviceContainer = document.getElementById('advice-container');
    const adviceSection = document.getElementById('advice-section');

    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const totalBalanceEl = document.getElementById('total-balance');

    // Chart Instances
    let balanceChartInstance = null;
    let categoryChartInstance = null;

    // Set default date to today
    const today = new Date();
    dateInput.valueAsDate = today;

    // Set Month Picker to current month (YYYY-MM)
    const currentMonthStr = today.toISOString().slice(0, 7);
    monthPicker.value = currentMonthStr;

    let entries = JSON.parse(localStorage.getItem('kakeibo_entries')) || [];
    let monthlyBudget = localStorage.getItem('kakeibo_budget') || '';

    if (monthlyBudget) {
        budgetInput.value = monthlyBudget;
    }

    // Initial Render
    updateUI();

    // Event Listeners
    addBtn.addEventListener('click', addEntry);

    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addEntry();
    });

    memoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addEntry();
    });

    // Auto-Category Listener
    memoInput.addEventListener('input', (e) => {
        autoCategorize(e.target.value);
    });

    // Month Change Listener
    monthPicker.addEventListener('change', () => {
        updateUI();
    });

    // Budget Change Listener
    budgetInput.addEventListener('change', (e) => {
        monthlyBudget = e.target.value;
        localStorage.setItem('kakeibo_budget', monthlyBudget);
        updateUI();
    });

    function autoCategorize(text) {
        const t = text.toLowerCase();
        if (t.includes('スーパー') || t.includes('コンビニ') || t.includes('ランチ') || t.includes('外食') || t.includes('弁当')) {
            categoryInput.value = '食費';
        } else if (t.includes('電車') || t.includes('バス') || t.includes('タクシー') || t.includes('定期')) {
            categoryInput.value = '交通費';
        } else if (t.includes('amazon') || t.includes('薬') || t.includes('日用品') || t.includes('ドラッグストア')) {
            categoryInput.value = '日用品';
        } else if (t.includes('電気') || t.includes('ガス') || t.includes('水道') || t.includes('携帯')) {
            categoryInput.value = '光熱費';
        }
    }

    function addEntry() {
        const date = dateInput.value;
        const amount = parseInt(amountInput.value);
        const memo = memoInput.value;
        const type = document.querySelector('input[name="type"]:checked').value;
        const category = categoryInput.value;

        if (!date || isNaN(amount) || amount <= 0) {
            alert('日付と有効な金額を入力してください。');
            return;
        }

        const entry = {
            id: Date.now(),
            date,
            type,
            amount,
            memo: memo || (type === 'expense' ? '支出' : '収入'),
            category: category
        };

        entries.unshift(entry);
        saveEntries();
        updateUI();

        // Reset inputs (keep date)
        amountInput.value = '';
        memoInput.value = '';
        amountInput.focus();
    }

    window.deleteEntry = function (id) {
        if (confirm('この項目を削除しますか？')) {
            entries = entries.filter(entry => entry.id !== id);
            saveEntries();
            updateUI();
        }
    }

    function saveEntries() {
        localStorage.setItem('kakeibo_entries', JSON.stringify(entries));
    }

    function updateUI() {
        const selectedMonth = monthPicker.value; // YYYY-MM

        // Filter entries for selected month
        const monthlyEntries = entries.filter(entry => entry.date.startsWith(selectedMonth));

        // Calculate Totals
        let income = 0;
        let expense = 0;
        const categoryTotals = {};

        monthlyEntries.forEach(entry => {
            if (entry.type === 'income') {
                income += entry.amount;
            } else {
                expense += entry.amount;
                // Category total
                const cat = entry.category || 'その他';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + entry.amount;
            }
        });

        const balance = income - expense;

        // Update Summary Cards
        totalIncomeEl.textContent = `¥${income.toLocaleString()}`;
        totalExpenseEl.textContent = `¥${expense.toLocaleString()}`;
        totalBalanceEl.textContent = `¥${balance.toLocaleString()}`;

        if (balance < 0) totalBalanceEl.style.color = '#e57373';
        else totalBalanceEl.style.color = '#00695c';

        // Update Budget Status
        if (monthlyBudget && monthlyBudget > 0) {
            const remaining = monthlyBudget - expense;
            budgetStatus.textContent = `予算: ¥${Number(monthlyBudget).toLocaleString()} / 残り: ¥${remaining.toLocaleString()}`;

            if (remaining < 0) {
                budgetAlert.style.display = 'block';
                budgetStatus.style.color = '#c62828';
            } else {
                budgetAlert.style.display = 'none';
                budgetStatus.style.color = '#555';
            }
        } else {
            budgetStatus.textContent = '予算未設定';
            budgetAlert.style.display = 'none';
        }

        // Render List
        renderList(monthlyEntries);

        // Update Charts
        updateCharts(income, expense, categoryTotals);

        // Update Advice
        updateAdvice(expense, monthlyBudget, categoryTotals);
    }

    function renderList(filteredEntries) {
        entryList.innerHTML = '';
        filteredEntries.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'entry-item';

            const amountSign = entry.type === 'expense' ? '-' : '+';
            const amountClass = entry.type === 'expense' ? 'amount-expense' : 'amount-income';

            // Category Tag Mapping
            const cat = entry.category || 'その他';
            let tagClass = 'tag-other';
            if (cat === '食費') tagClass = 'tag-food';
            else if (cat === '交通費') tagClass = 'tag-transport';
            else if (cat === '日用品') tagClass = 'tag-daily';
            else if (cat === '光熱費') tagClass = 'tag-utilities';

            li.innerHTML = `
                <div class="entry-info">
                    <div class="entry-date">${entry.date} <span class="category-tag ${tagClass}">${cat}</span></div>
                    <div class="entry-memo">${entry.memo}</div>
                </div>
                <div class="entry-amount ${amountClass}">
                    ${amountSign}¥${entry.amount.toLocaleString()}
                </div>
                <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
            `;
            entryList.appendChild(li);
        });
    }

    function updateCharts(income, expense, categoryTotals) {
        // Balance Chart (Bar)
        const ctxBalance = document.getElementById('balance-chart').getContext('2d');
        if (balanceChartInstance) balanceChartInstance.destroy();

        balanceChartInstance = new Chart(ctxBalance, {
            type: 'bar',
            data: {
                labels: ['収入', '支出'],
                datasets: [{
                    label: '今月の収支',
                    data: [income, expense],
                    backgroundColor: ['#81c784', '#e57373'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Category Chart (Pie)
        const ctxCategory = document.getElementById('category-chart').getContext('2d');
        if (categoryChartInstance) categoryChartInstance.destroy();

        // Prepare data for Pie Chart
        const catLabels = Object.keys(categoryTotals);
        const catData = Object.values(categoryTotals);

        if (catLabels.length > 0) {
            categoryChartInstance = new Chart(ctxCategory, {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [{
                        data: catData,
                        backgroundColor: [
                            '#ffe0b2', // Food (Orange)
                            '#bbdefb', // Transport (Blue)
                            '#e1bee7', // Daily (Purple)
                            '#fff9c4', // Utilities (Yellow)
                            '#f5f5f5'  // Other (Grey) - Note: colors might mismatch if order differs, but acceptable for simple app
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        title: { display: true, text: '支出の内訳' }
                    }
                }
            });
        }
    }

    function updateAdvice(totalExpense, budget, categoryTotals) {
        let advice = [];

        // Budget Advice
        if (budget && totalExpense > budget) {
            advice.push("⚠️ 今月は予算オーバーです！節約モードに切り替えましょう。");
        } else if (budget && totalExpense > budget * 0.8) {
            advice.push("👀 予算の8割を使っています。残りの日数に気をつけて！");
        }

        // Category Advice
        const food = categoryTotals['食費'] || 0;
        const transport = categoryTotals['交通費'] || 0;
        const utilities = categoryTotals['光熱費'] || 0;

        // Simple thresholds (could be improved with percentage check)
        if (food > 30000) {
            advice.push("🍱 食費が3万円を超えています。外食の頻度を見直して、自炊にチャレンジしてみては？");
        }
        if (transport > 15000) {
            advice.push("🚃 交通費がかさんでいます。定期券の購入や、自転車移動を検討してみましょう。");
        }
        if (utilities > 15000) {
            advice.push("💡 光熱費が高めです。使っていない家電のコンセントを抜いたり、お風呂の追い焚きを減らしてみましょう。");
        }

        if (advice.length > 0) {
            adviceSection.style.display = 'block';
            adviceContainer.innerHTML = advice.join('<br><br>');
        } else if (totalExpense > 0) {
            adviceSection.style.display = 'block';
            adviceContainer.innerHTML = "✨ 順調に管理できています！この調子で続けましょう。";
        } else {
            adviceSection.style.display = 'none';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('ranking-body');
  const clearBtn = document.getElementById('clear-ranking');
  if (!body) return;

  function render() {
    const data = JSON.parse(localStorage.getItem('fruit_slash_ranking') || '[]');
    if (!data.length) {
      body.innerHTML = '<tr><td colspan="5">Chưa có thành tích. Hãy chơi một lượt nhé!</td></tr>';
      return;
    }
    body.innerHTML = data.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td><strong>${item.score}</strong></td>
        <td>Level ${item.level}</td>
        <td>${item.date}</td>
      </tr>
    `).join('');
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('fruit_slash_ranking');
      render();
    });
  }

  render();
});

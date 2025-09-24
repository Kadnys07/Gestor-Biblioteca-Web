function setupTableFilter(tableId, searchInputId, statusFilterId) {
    const searchInput = document.getElementById(searchInputId);
    const statusSelect = statusFilterId ? document.getElementById(statusFilterId) : null;
    const tableRows = document.querySelectorAll(`#${tableId} tbody tr`);

    function filterRows() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusTerm = statusSelect ? statusSelect.value : 'todos';

        tableRows.forEach(row => {
            const searchData = (row.dataset.search || '').toLowerCase();
            const statusData = row.dataset.status || '';
            const matchesSearch = searchData.includes(searchTerm);
            const matchesStatus = (statusTerm === 'todos') || (statusData === statusTerm);

            if (matchesSearch && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterRows);
    if (statusSelect) statusSelect.addEventListener('change', filterRows);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DO MENU HAMBÚRGUER (A PARTE QUE FALTAVA) ---
    const sidebar = document.getElementById('sidebar');
    const hamburgerButton = document.getElementById('hamburger-button');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Verifica se os elementos do menu existem na página antes de adicionar os eventos
    if (sidebar && hamburgerButton && sidebarOverlay) {
        const openSidebar = () => {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
        };
        const closeSidebar = () => {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        };
        hamburgerButton.addEventListener('click', openSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    // --- FIM DA LÓGICA DO MENU ---

    // Configuração dos filtros das tabelas
    if (document.getElementById('tabela-livros')) {
        setupTableFilter('tabela-livros', 'livro-search', 'livro-status-filter');
    }
    if (document.getElementById('tabela-leitores')) {
        setupTableFilter('tabela-leitores', 'leitor-search', null);
    }
    if (document.getElementById('tabela-emprestimos')) {
        setupTableFilter('tabela-emprestimos', 'emprestimo-search', 'emprestimo-status-filter');
    }

    // Lógica para salvar edição de Livro
    const formEditLivro = document.getElementById('edit-livro-form');
    if (formEditLivro) {
        formEditLivro.addEventListener('submit', function(event) {
            event.preventDefault();
            const id = document.getElementById('edit-livro-id').value;
            const titulo = document.getElementById('edit-livro-nome').value;
            const autor = document.getElementById('edit-livro-autor').value;
            const genero = document.getElementById('edit-livro-genero').value;
            const disponivel = document.getElementById('edit-livro-qntd').value;
            fetch('/livros/editar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, titulo, autor, genero, disponivel })
            }).then(response => response.json()).then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Erro ao atualizar o livro: ' + data.message);
                }
            }).catch(error => {
                console.error('Erro na requisição:', error);
                alert('Ocorreu um erro de comunicação com o servidor.');
            });
        });
    }

    // Lógica para salvar edição de Leitor
    const formEditLeitor = document.getElementById('edit-leitor-form');
    if (formEditLeitor) {
        formEditLeitor.addEventListener('submit', function(event) {
            event.preventDefault();
            const id = document.getElementById('edit-leitor-id').value;
            const nome = document.getElementById('edit-leitor-nome-completo').value;
            const cpf = document.getElementById('edit-leitor-cpf').value;
            const nascimento = document.getElementById('edit-leitor-nascimento').value;
            const celular = document.getElementById('edit-leitor-celular').value;
            const email = document.getElementById('edit-leitor-email').value;
            const cep = document.getElementById('edit-leitor-cep').value;
            const endereco = document.getElementById('edit-leitor-endereco').value;
            fetch('/leitores/editar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, nome, cpf, nascimento, celular, email, cep, endereco })
            }).then(response => response.json()).then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Erro ao atualizar o leitor: ' + data.message);
                }
            }).catch(error => {
                console.error('Erro na requisição:', error);
                alert('Ocorreu um erro de comunicação com o servidor.');
            });
        });
    }

    // Lógica para salvar edição de Empréstimo
    const formEditEmprestimo = document.getElementById('edit-emprestimo-form');
    if (formEditEmprestimo) {
        formEditEmprestimo.addEventListener('submit', function(event) {
            event.preventDefault();
            const id = document.getElementById('edit-emprestimo-id').value;
            const devolucao = document.getElementById('edit-data-devolucao').value;
            const status = document.getElementById('edit-status').value;
            fetch('/emprestimos/editar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, devolucao, status })
            }).then(response => response.json()).then(data => {
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Erro ao atualizar empréstimo: ' + data.message);
                }
            }).catch(error => {
                console.error('Erro na requisição:', error);
                alert('Ocorreu um erro de comunicação com o servidor.');
            });
        });
    }
});

// FUNÇÕES DE MODAL (sem alterações)
window.abrirModalLivro = function(livro, idx) {
    document.getElementById('edit-livro-id').value = idx;
    document.getElementById('edit-livro-nome').value = livro.titulo;
    document.getElementById('edit-livro-autor').value = livro.autor;
    document.getElementById('edit-livro-genero').value = livro.genero;
    document.getElementById('edit-livro-qntd').value = livro.disponivel;
    document.getElementById('edit-livro-modal').classList.remove('hidden');
};
window.closeEditLivroModal = function() {
    document.getElementById('edit-livro-modal').classList.add('hidden');
};
window.abrirModalLeitor = function(leitor, idx) {
    document.getElementById('edit-leitor-id').value = idx;
    document.getElementById('edit-leitor-nome-completo').value = leitor.nome;
    document.getElementById('edit-leitor-cpf').value = leitor.cpf;
    document.getElementById('edit-leitor-nascimento').value = leitor.nascimento || '';
    document.getElementById('edit-leitor-celular').value = leitor.celular || '';
    document.getElementById('edit-leitor-email').value = leitor.email;
    document.getElementById('edit-leitor-cep').value = leitor.cep || '';
    document.getElementById('edit-leitor-endereco').value = leitor.endereco || '';
    document.getElementById('edit-leitor-modal').classList.remove('hidden');
};
window.closeEditLeitorModal = function() {
    document.getElementById('edit-leitor-modal').classList.add('hidden');
};
window.abrirModalEmprestimo = function(emp, idx) {
    document.getElementById('edit-emprestimo-id').value = idx;
    document.getElementById('modal-livro-info').textContent = emp.livro;
    document.getElementById('modal-leitor-info').textContent = emp.leitor;
    document.getElementById('edit-data-inicio').value = emp.dataInicio || '';
    document.getElementById('edit-data-devolucao').value = emp.devolucao;
    document.getElementById('edit-status').value = emp.status;
    document.getElementById('edit-emprestimo-modal').classList.remove('hidden');
};
window.closeEditEmprestimoModal = function() {
    document.getElementById('edit-emprestimo-modal').classList.add('hidden');
};


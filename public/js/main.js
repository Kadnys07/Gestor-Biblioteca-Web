document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DO MENU RESPONSIVO ---
    const hamburgerButton = document.getElementById('hamburger-button');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (hamburgerButton && sidebar && sidebarOverlay) {
        hamburgerButton.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
        });
    }

    // --- LÓGICA DO SELETOR DE BUSCA (TOM SELECT) ---
    const leitorSelectSearch = document.getElementById('leitor-select-search');
    if (leitorSelectSearch && window.listaDeLeitores) {
        new TomSelect(leitorSelectSearch, {
            options: window.listaDeLeitores,
            create: false,
            maxItems: 1,
            sortField: { field: "text", direction: "asc" }
        });
    }

    // --- LÓGICA DOS FILTROS DE TABELA ---
    if (document.getElementById('tabela-livros')) {
        setupTableFilter('tabela-livros', 'livro-search', 'livro-status-filter');
    }
    if (document.getElementById('tabela-leitores')) {
        setupTableFilter('tabela-leitores', 'leitor-search', null);
    }
    if (document.getElementById('tabela-emprestimos')) {
        setupTableFilter('tabela-emprestimos', 'emprestimo-search', 'emprestimo-status-filter');
    }

    // --- LÓGICA PARA SALVAR EDIÇÕES ---

    function handleFetchErrors(response) {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    }

    // Edição de Livro
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
            })
            .then(handleFetchErrors)
            .then(data => {
                if (data.success) {
                    window.location.reload();
                }
            })
            .catch(err => {
                console.error('Erro ao editar livro:', err);
                showModalError('edit-livro-error', err.message || 'Ocorreu um erro de comunicação.');
            });
        });
    }

    // Edição de Leitor
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
            })
            .then(handleFetchErrors)
            .then(data => {
                if (data.success) {
                    window.location.reload();
                }
            })
            .catch(err => {
                console.error('Erro ao editar leitor:', err);
               
                
                showModalError('edit-leitor-error', err.message || 'Ocorreu um erro de comunicação.');
            });
        });
    }

    // Edição de Empréstimo
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
            })
            .then(handleFetchErrors)
            .then(data => {
                if (data.success) {
                    window.location.reload();
                }
            })
            .catch(err => {
                console.error('Erro ao editar empréstimo:', err);
                // ARQUITETO: Substituído alert por feedback no modal.
                showModalError('edit-emprestimo-error', err.message || 'Ocorreu um erro de comunicação.');
            });
        });
    }
});

// --- FUNÇÕES GLOBAIS ---

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

            row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterRows);
    if (statusSelect) statusSelect.addEventListener('change', filterRows);
}

// ARQUITETO: Funções auxiliares para manipular mensagens de erro nos modais.
function showModalError(errorElementId, message) {
    const errorDiv = document.getElementById(errorElementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideModalError(errorElementId) {
    const errorDiv = document.getElementById(errorElementId);
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
    }
}

// Funções para abrir e fechar modais
window.abrirModalLivro = function(livro, id) {
    hideModalError('edit-livro-error'); // Limpa erros antigos ao abrir
    document.getElementById('edit-livro-id').value = id;
    document.getElementById('edit-livro-nome').value = livro.titulo;
    document.getElementById('edit-livro-autor').value = livro.autor;
    document.getElementById('edit-livro-genero').value = livro.genero;
    document.getElementById('edit-livro-qntd').value = livro.disponivel;
    document.getElementById('edit-livro-modal').classList.remove('hidden');
};
window.closeEditLivroModal = function() {
    document.getElementById('edit-livro-modal').classList.add('hidden');
};

window.abrirModalLeitor = function(leitor, id) {
    hideModalError('edit-leitor-error'); // Limpa erros antigos ao abrir
    document.getElementById('edit-leitor-id').value = id;
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

window.abrirModalEmprestimo = function(emp, id) {
    hideModalError('edit-emprestimo-error'); // Limpa erros antigos ao abrir
    document.getElementById('edit-emprestimo-id').value = id;
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


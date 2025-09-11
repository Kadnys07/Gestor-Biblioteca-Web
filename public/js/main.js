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

// Inicialização automática para cada página
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tabela-livros')) {
        setupTableFilter('tabela-livros', 'livro-search', 'livro-status-filter');
    }
    if (document.getElementById('tabela-leitores')) {
        setupTableFilter('tabela-leitores', 'leitor-search', null);
    }
    if (document.getElementById('tabela-emprestimos')) {
        setupTableFilter('tabela-emprestimos', 'emprestimo-search', 'emprestimo-status-filter');
    }
});

// LIVRO
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

// LEITOR
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

// EMPRESTIMO
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
<script>
  import { Link } from 'yrv';
</script>

<div>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">Svelte-App</a>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon" />
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
          <li class="nav-item">
            <Link class="nav-link" href="/">Home</Link>
          </li>
          <li class="nav-item">
            <Link class="nav-link" href="/users">Users</Link>
          </li>
          <li class="nav-item">
            <Link class="nav-link" href="/chart">Chart</Link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</div>

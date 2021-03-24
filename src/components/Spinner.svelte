<script>
  import { showSpinner } from '../store/store.js';
</script>

<div class="Spinner">
  {#if $showSpinner}
    <div class="d-flex justify-content-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden" />
      </div>
    </div>
  {/if}
</div>

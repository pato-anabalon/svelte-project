<script>
  export let name = '';
  export let lastName = '';
  export let photo = '';

  function mouseOver(name) {
    console.log('🚀 - file: Card.svelte - line 7 - name', name);
  }
</script>

<div class="col-sm">
  <div class="Card card">
    <img src={photo} class="card-img-top" alt="{name} photo" on:mouseover={mouseOver(name)} />
    <div class="card-body">
      <h5 class="card-title">{name} {lastName}</h5>
    </div>
  </div>
</div>

<style>
  .Card {
    border-radius: 25px;
    background-color: #cacaca;
    color: #4d4d4d;
    border-color: #ccf2f4;
  }

  .Card img {
    border-radius: 25px 25px 0 0;
  }
</style>

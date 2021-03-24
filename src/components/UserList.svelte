<script>
  import axios from 'axios';
  import { showSpinner } from '../store/store.js';
  import { onMount } from 'svelte';
  import Card from './Card.svelte';

  let response;
  let userList = [];

  onMount(async () => {
    try {
      response = await axios({
        method: 'post',
        url: 'https://run.mocky.io/v3/3ab3f5cc-ca26-460a-9c23-9897f49d167b',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        userList = response.data.data;
        showSpinner.update(() => false);
      }
    } catch (error) {
      console.warn('file: UserList.svelte - onMount', error.message);
    }
  });
</script>

<div class="UserList container">
  <div class="row">
    {#each userList as { name, lastName, photo }}
      <Card {name} {lastName} {photo} />
    {/each}
  </div>
</div>

<style>
  .UserList {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

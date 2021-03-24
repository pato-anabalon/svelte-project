<script>
  import { Router, Route } from 'yrv';
  import Menu from './components/Menu.svelte';
  import PieChart from './components/PieChart.svelte';
  import Spinner from './components/Spinner.svelte';
  import UserList from './components/UserList.svelte';
</script>

<main class="container">
  <Menu />

  <Router>
    <Route exact>Hello World!</Route>
    <Route fallback>Not found</Route>
    <Route path="/users">
      <Spinner />
      <UserList />
    </Route>
    <Route path="/chart">
      <Spinner />
      <PieChart />
    </Route>
  </Router>
</main>

<style>
</style>

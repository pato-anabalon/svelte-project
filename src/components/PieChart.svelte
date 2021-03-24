<script>
  import axios from 'axios';
  import { showSpinner } from '../store/store.js';
  import { onMount } from 'svelte';
  import Chartist from 'chartist';

  let response;
  let chartData = [];

  onMount(async () => {
    try {
      response = await axios({
        method: 'post',
        url: 'https://run.mocky.io/v3/73413c07-1a1c-4d34-991b-2dcebb226589',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        chartData = {
          labels: response.data.data.map((item) => item.asset),
          series: response.data.data.map((item) => item.percentage),
        };
        showSpinner.update(() => false);

        new Chartist.Pie('.ct-chart', chartData);
      }

      /* Add a basic data series with six labels and values */
      var data = {
        labels: ['1', '2', '3', '4', '5', '6'],
        series: [
          {
            data: [1, 32, 3, 5, 8, 13],
          },
        ],
      };

      /* Set some base options (settings will override the default settings in Chartist.js *see default settings*). We are adding a basic label interpolation function for the xAxis labels. */
      var options = {
        axisX: {
          labelInterpolationFnc: function (value) {
            return 'Calendar Week ' + value;
          },
        },
      };

      /* Now we can specify multiple responsive settings that will override the base settings based on order and if the media queries match. In this example we are changing the visibility of dots and lines as well as use different label interpolations for space reasons. */
      var responsiveOptions = [
        [
          'screen and (min-width: 641px) and (max-width: 1024px)',
          {
            showPoint: false,
            axisX: {
              labelInterpolationFnc: function (value) {
                return 'Week ' + value;
              },
            },
          },
        ],
        [
          'screen and (max-width: 640px)',
          {
            showLine: false,
            axisX: {
              labelInterpolationFnc: function (value) {
                return 'W' + value;
              },
            },
          },
        ],
      ];

      /* Initialize the chart with the above settings */
      new Chartist.Line('#my-chart', data, options, responsiveOptions);

      new Chartist.Line(
        '.ct-chart-2',
        {
          labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          series: [
            [12, 9, 7, 8, 5],
            [2, 1, 3.5, 7, 3],
            [1, 3, 4, 5, 6],
          ],
        },
        {
          fullWidth: true,
          chartPadding: {
            right: 40,
          },
        }
      );

      var chart = new Chartist.Pie('#ct-chart-animated', chartData, {
        donut: true,
        showLabel: true,
      });

      chart.on('draw', function (data) {
        console.log('🚀 - file: PieChart.svelte - line 104 - data', data);
        if (data.type === 'slice') {
          // Get the total path length in order to use for dash array animation
          var pathLength = data.element._node.getTotalLength();

          // Set a dasharray that matches the path length as prerequisite to animate dashoffset
          data.element.attr({
            'stroke-dasharray': pathLength + 'px ' + pathLength + 'px',
          });

          // Create animation definition while also assigning an ID to the animation for later sync usage
          var animationDefinition = {
            'stroke-dashoffset': {
              id: 'anim' + data.index,
              dur: 1000,
              from: -pathLength + 'px',
              to: '0px',
              easing: Chartist.Svg.Easing.easeOutQuint,
              // We need to use `fill: 'freeze'` otherwise our animation will fall back to initial (not visible)
              fill: 'freeze',
            },
          };

          // If this was not the first slice, we need to time the animation so that it uses the end sync event of the previous animation
          if (data.index !== 0) {
            animationDefinition['stroke-dashoffset'].begin = 'anim' + (data.index - 1) + '.end';
          }

          // We need to set an initial value before the animation starts as we are not in guided mode which would do that for us
          data.element.attr({
            'stroke-dashoffset': -pathLength + 'px',
          });

          // We can't use guided mode as the animations need to rely on setting begin manually
          // See http://gionkunz.github.io/chartist-js/api-documentation.html#chartistsvg-function-animate
          data.element.animate(animationDefinition, false);
        }
      });

      // For the sake of the example we update the chart every time it's created with a delay of 8 seconds
      chart.on('created', function () {
        window.animation = chart.update.bind(chart);
      });
    } catch (error) {
      console.warn('file: PieChart.svelte - onMount', error.message);
    }
  });
</script>

<div class="PieChart">
  <div class="UserList container">
    <div class="row">
      <div class="ct-chart ct-double-octave" />
      <div id="ct-chart-animated" class="ct-double-octave" />
    </div>
    <div class="ct-chart-2" />
    <div id="my-chart" />
  </div>
</div>

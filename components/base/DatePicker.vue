<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import 'v-calendar/dist/style.css';
import dayjs from 'dayjs';
import { MP_ORIGIN_TIMESTAMP } from '~/config';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  modelValue: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['update:model-value', 'close']);

const date = computed({
  get: () => (props.modelValue ? dayjs.unix(props.modelValue).toDate() : null),
  set: value => {
    if (!value) {
      // 清选:写回 null,避免 dayjs(null) 产生 1970 时间戳
      emit('update:model-value', null);
    } else {
      emit('update:model-value', dayjs(value).unix());
    }
    emit('close');
  },
});

const attrs = {
  transparent: true,
  borderless: true,
  locale: 'zh-CN',
  color: 'primary',
  'is-dark': { selector: 'html', darkClass: 'dark' },
  'first-day-of-week': 2,
  'min-date': dayjs.unix(MP_ORIGIN_TIMESTAMP).toDate(),
  'max-date': new Date(),
  // modelValue 为空时 v-calendar 会把初始视图定位到 min-date(2012-08),这里显式指定当前月
  'initial-page': { month: dayjs().month() + 1, year: dayjs().year() },
};

function onDayClick(_: any, event: MouseEvent): void {
  const target = event.target as HTMLElement;
  target.blur();
}
</script>

<template>
  <VCalendarDatePicker v-model="date" v-bind="{ ...attrs, ...$attrs }" @dayclick="onDayClick" />
</template>

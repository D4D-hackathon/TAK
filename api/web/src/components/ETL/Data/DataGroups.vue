<template>
    <div>
        <div class='card-header d-flex'>
            <h3 class='card-title'>
                Channels
            </h3>
        </div>

        <div class='card-body'>
            <TablerNone
                v-if='!groups.length'
                :create='false'
                :compact='true'
                label='No Channels'
            />
            <div
                v-else
                class='table-responsive'
            >
                <table class='table table-hover table-vcenter card-table'>
                    <thead>
                        <tr>
                            <th>Channel</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='group in groups'
                            :key='group'
                        >
                            <td v-text='group' />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import type { ETLData } from '../../../types.ts';
import { TablerNone } from '@tak-ps/vue-tabler';

const props = defineProps<{
    data: ETLData;
}>();

const groups = computed(() => {
    return Array.isArray(props.data.mission_groups) ? props.data.mission_groups : [];
});
</script>

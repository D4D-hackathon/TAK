<template>
    <div>
        <div class='card-header d-flex'>
            <h3 class='card-title'>
                Layers
            </h3>

            <div class='ms-auto btn-list'>
                <TablerRefreshButton
                    title='Refresh'
                    :loading='loading'
                    @click='fetchList'
                />
            </div>
        </div>

        <div class='card-body'>
            <TablerAlert
                v-if='error'
                title='Layer Error'
                :err='error'
                :compact='true'
            />
            <TablerLoading v-else-if='loading' />
            <TablerNone
                v-else-if='!layers.length'
                :create='false'
                :compact='true'
                label='No Layers'
            />
            <div
                v-else
                class='table-responsive'
            >
                <table class='table table-hover table-vcenter card-table'>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='layer in layers'
                            :key='layer.id'
                        >
                            <td v-text='layer.name' />
                            <td v-text='layer.enabled ? "Enabled" : "Disabled"' />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { server } from '../../../std.ts';
import {
    TablerAlert,
    TablerLoading,
    TablerNone,
    TablerRefreshButton,
} from '@tak-ps/vue-tabler';

type DataLayer = {
    id: number;
    name: string;
    enabled?: boolean;
};

const route = useRoute();
const loading = ref(true);
const error = ref<Error>();
const layers = ref<DataLayer[]>([]);

onMounted(async () => {
    await fetchList();
});

async function fetchList() {
    loading.value = true;
    error.value = undefined;

    try {
        const { data, error: reqError } = await server.GET('/api/connection/{:connectionid}/layer', {
            params: {
                path: {
                    ':connectionid': Number(route.params.connectionid),
                },
                query: {
                    limit: 100,
                    page: 0,
                    filter: '',
                    data: Number(route.params.dataid),
                }
            }
        });

        if (reqError) throw new Error(reqError.message);
        layers.value = Array.isArray(data?.items) ? data.items : [];
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    }

    loading.value = false;
}
</script>

package com.up24.news;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModuleBoundariesTest {
    @Test
    void modulesRespectTheirBoundaries() {
        ApplicationModules.of(NewsApplication.class).verify();
    }
}
